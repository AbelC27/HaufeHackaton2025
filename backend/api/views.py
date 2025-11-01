import requests
import re
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
def review_code(request):
    """
    AI Code Review endpoint - Only handles LLM interaction.
    Frontend handles all Supabase operations.
    
    Expects: {"code": "...", "language": "python", "focus": "general", "auto_fix": false, "custom_rules": "...", "estimate_effort": true}
    Returns: {"review": "AI feedback...", "fixed_code": "...", "effort_estimation_minutes": 15}
    """
    
    # Get the code from request
    code_to_review = request.data.get('code', '')
    language = request.data.get('language', 'python').lower()
    focus = request.data.get('focus', 'general').lower()
    auto_fix = request.data.get('auto_fix', False)
    custom_rules = request.data.get('custom_rules', '')
    estimate_effort = request.data.get('estimate_effort', True)
    
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
    
    # Build custom rules section
    custom_rules_section = ""
    if custom_rules and custom_rules.strip():
        custom_rules_section = f"""
        
        IMPORTANT - CUSTOM CODING GUIDELINES:
        The developer has specified these custom rules that MUST be enforced:
        ---
        {custom_rules}
        ---
        Make sure to check the code against these custom guidelines and highlight any violations.
        """

    # Build effort estimation section
    effort_section = ""
    if estimate_effort:
        effort_section = """
        
        EFFORT ESTIMATION:
        At the end of your review, provide an estimated time in minutes to fix all identified issues.
        Format it exactly as: "**Estimated Effort:** X minutes" where X is a number between 5-120.
        Consider:
        - Number and complexity of issues
        - Code size and refactoring scope
        - Testing requirements
        """

    if auto_fix:
        # Prompt for auto-fix mode - ask for fixed code in structured format
        prompt = f"""
        You are an expert {language.upper()} programmer and code reviewer.
        Analyze this code and provide a fixed, improved version.
        {focus_instruction}
        Follow {style_guide} guidelines.
        {custom_rules_section}
        
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
        {effort_section}
        
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
        {custom_rules_section}
        
        Provide your feedback in the following format:
        
        ## Summary
        [Brief overview of the code quality]
        
        ## Issues Found
        [List critical issues with severity: HIGH/MEDIUM/LOW]
        
        ## Suggestions
        [Specific improvement recommendations]
        
        ## Positive Aspects
        [What the code does well]
        {effort_section}
        
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

        import re
        
        # Extract effort estimation if present
        effort_minutes = 0
        if estimate_effort:
            effort_pattern = r'\*\*Estimated Effort:\*\*\s*(\d+)\s*minutes?'
            effort_match = re.search(effort_pattern, review_text, re.IGNORECASE)
            if effort_match:
                effort_minutes = int(effort_match.group(1))
            else:
                # Fallback: try simpler pattern
                effort_pattern2 = r'estimated?\s+(?:effort|time)[:\s]+(\d+)\s*(?:minutes?|mins?)'
                effort_match2 = re.search(effort_pattern2, review_text, re.IGNORECASE)
                if effort_match2:
                    effort_minutes = int(effort_match2.group(1))
                else:
                    # Default estimation based on review length and issue count
                    high_issues = len(re.findall(r'severity:\s*high', review_text, re.IGNORECASE))
                    medium_issues = len(re.findall(r'severity:\s*medium', review_text, re.IGNORECASE))
                    low_issues = len(re.findall(r'severity:\s*low', review_text, re.IGNORECASE))
                    effort_minutes = (high_issues * 15) + (medium_issues * 10) + (low_issues * 5)
                    effort_minutes = max(5, min(120, effort_minutes))  # Clamp between 5-120

        if auto_fix:
            # Extract fixed code from the response
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
                'has_fix': bool(fixed_code),
                'effort_estimation_minutes': effort_minutes
            })
        else:
            return Response({
                'review': review_text,
                'effort_estimation_minutes': effort_minutes
            })

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


@api_view(['POST'])
def follow_up_review(request):
    """
    Conversational follow-up endpoint for review discussions.
    Allows users to ask questions about their review.
    
    Expects: {
        "original_code": "...",
        "original_review": "...",
        "user_question": "Why is this a problem?",
        "language": "python"
    }
    Returns: {"ai_response": "..."}
    """
    
    original_code = request.data.get('original_code', '')
    original_review = request.data.get('original_review', '')
    user_question = request.data.get('user_question', '')
    language = request.data.get('language', 'python').lower()
    
    if not user_question:
        return Response(
            {'error': 'No question provided.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Build conversational prompt
    prompt = f"""
    You are an expert {language.upper()} programming mentor engaged in a helpful conversation.
    
    CONTEXT:
    A developer submitted this code for review:
    ---
    {original_code[:1000]}  
    ---
    
    You previously provided this review:
    ---
    {original_review[:2000]}
    ---
    
    Now the developer asks: "{user_question}"
    
    Provide a clear, helpful answer that:
    1. Directly addresses their question
    2. Provides code examples if relevant
    3. Explains concepts in simple terms
    4. Suggests concrete next steps
    5. Encourages good coding practices
    
    Keep your response conversational and educational. Use markdown formatting for code.
    
    Your response:
    """
    
    ollama_url = "http://localhost:11434/api/generate"
    payload = {
        "model": "codellama",
        "prompt": prompt,
        "stream": False
    }
    
    try:
        response = requests.post(ollama_url, json=payload, timeout=120)
        response.raise_for_status()
        
        response_data = response.json()
        ai_response = response_data.get("response", "Error: No response from model.")
        
        return Response({'ai_response': ai_response})
        
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