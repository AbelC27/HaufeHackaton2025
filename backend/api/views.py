import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
def review_code(request):
    """
    AI Code Review endpoint - Only handles LLM interaction.
    Frontend handles all Supabase operations.
    
    Expects: {"code": "...", "language": "python", "focus": "general", "auto_fix": false}
    Returns: {"review": "AI feedback...", "fixed_code": "..."} (if auto_fix=true)
    """
    
    # Get the code from request
    code_to_review = request.data.get('code', '')
    language = request.data.get('language', 'python').lower()
    focus = request.data.get('focus', 'general').lower()
    auto_fix = request.data.get('auto_fix', False)
    
    if not code_to_review:
        return Response(
            {'error': 'No code provided.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # Build context-aware prompt based on language and focus
    focus_instructions = {
        'general': 'Focus on bugs, code style, best practices, and potential improvements.',
        'security': 'Focus on security vulnerabilities, input validation, authentication issues, and potential exploits.',
        'performance': 'Focus on performance bottlenecks, optimization opportunities, memory usage, and algorithmic efficiency.',
        'style': 'Focus on code style, readability, naming conventions, and adherence to language-specific style guides.',
        'bugs': 'Focus on identifying bugs, logic errors, edge cases, and potential runtime issues.'
    }
    
    language_styles = {
        'python': 'PEP8',
        'javascript': 'ESLint/Airbnb',
        'typescript': 'TSLint/ESLint',
        'java': 'Google Java Style',
        'csharp': 'Microsoft C# Conventions',
        'go': 'Effective Go',
        'rust': 'Rust Style Guide',
        'ruby': 'Ruby Style Guide',
    }
    
    style_guide = language_styles.get(language, 'common best practices')
    focus_instruction = focus_instructions.get(focus, focus_instructions['general'])
    
    if auto_fix:
        # Prompt for auto-fix mode - ask for fixed code in structured format
        prompt = f"""
        You are an expert {language.upper()} programmer and code reviewer.
        Analyze this code and provide a fixed, improved version.
        {focus_instruction}
        Follow {style_guide} guidelines.
        
        IMPORTANT: You MUST provide the complete corrected code.
        
        Provide your response in this EXACT format:
        
        ## Analysis
        [What's wrong with the code and what needs to be fixed]
        
        ## Fixed Code
        ```{language}
        [PUT THE COMPLETE CORRECTED CODE HERE]
        ```
        
        ## Explanation
        [Explain what was changed and why]
        
        Code to fix:
        ---
        {code_to_review}
        ---
        
        Your response (follow the format above):
        """
    else:
        # Standard review prompt
        prompt = f"""
        You are an expert code reviewer with deep knowledge of {language.upper()}.
        Analyze the following {language.upper()} code and provide a clear, structured review.
        {focus_instruction}
        Consider {style_guide} style guidelines.
        
        Provide your feedback in the following format:
        
        ## Summary
        [Brief overview of the code quality]
        
        ## Issues Found
        [List critical issues with severity: HIGH/MEDIUM/LOW]
        
        ## Suggestions
        [Specific improvement recommendations]
        
        ## Positive Aspects
        [What the code does well]
        
        Code to review:
        ---
        {code_to_review}
        ---
        
        Your detailed review:
        """

    # Send to Ollama
    ollama_url = "http://localhost:11434/api/generate"
    payload = {
        "model": "codellama",
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(ollama_url, json=payload, timeout=180)
        response.raise_for_status()

        response_data = response.json()
        review_text = response_data.get("response", "Error: No response from model.")

        if auto_fix:
            # Extract fixed code from the response
            import re
            
            fixed_code = ''
            
            # Method 1: Try to extract code from markdown code blocks
            # Pattern: ```language\ncode\n```
            code_block_pattern = r'```(?:' + language + r')?\s*\n(.*?)\n```'
            matches = re.findall(code_block_pattern, review_text, re.DOTALL)
            
            if matches:
                # Use the first (or largest) code block as the fixed code
                fixed_code = max(matches, key=len) if len(matches) > 1 else matches[0]
            else:
                # Method 2: Look for "Fixed Code" section
                fixed_section_pattern = r'##\s*Fixed Code\s*[:\n]+(.*?)(?=\n##|\Z)'
                fixed_match = re.search(fixed_section_pattern, review_text, re.DOTALL | re.IGNORECASE)
                if fixed_match:
                    fixed_code = fixed_match.group(1).strip()
                    # Remove code fence markers if present
                    fixed_code = re.sub(r'^```\w*\n|```$', '', fixed_code, flags=re.MULTILINE).strip()
            
            # Clean up the fixed code
            if fixed_code:
                fixed_code = fixed_code.strip()
            
            return Response({
                'review': review_text,
                'fixed_code': fixed_code,
                'has_fix': bool(fixed_code)
            })
        else:
            return Response({'review': review_text})

    except requests.exceptions.ConnectionError:
        return Response(
            {'error': 'Connection Error. Is the Ollama server running?'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except requests.exceptions.RequestException as e:
        return Response(
            {'error': f'An error occurred: {e}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )