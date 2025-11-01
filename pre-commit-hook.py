#!/usr/bin/env python
"""
AI Code Review Pre-Commit Hook
Automatically reviews staged code before commits
"""

import sys
import os
import subprocess
import json
import re
from pathlib import Path

# Try to import requests, install if missing
try:
    import requests
except ImportError:
    print("📦 Installing required package: requests")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

# Configuration
API_URL = "http://127.0.0.1:8000/api/review/"
FOCUS_TYPE = "security"  # Options: general, security, performance, style, bugs
BLOCK_ON_HIGH_SEVERITY = True

# Language detection
LANGUAGE_MAP = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.java': 'java',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'cpp',
    '.php': 'php',
    '.rb': 'ruby',
}

def get_staged_files():
    """Get list of staged files"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
            capture_output=True,
            text=True,
            check=True
        )
        return [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
    except subprocess.CalledProcessError:
        return []

def get_file_language(filepath):
    """Detect programming language from file extension"""
    ext = Path(filepath).suffix.lower()
    return LANGUAGE_MAP.get(ext)

def read_file_content(filepath):
    """Read file content safely"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"⚠️  Could not read {filepath}: {e}")
        return None

def review_code(code, language, focus):
    """Send code to AI review API"""
    try:
        response = requests.post(
            API_URL,
            json={
                'code': code,
                'language': language,
                'focus': focus,
                'auto_fix': False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('review', ''), None
        else:
            return None, f"API returned status {response.status_code}"
    except requests.exceptions.ConnectionError:
        return None, "Cannot connect to AI service. Is it running?"
    except requests.exceptions.Timeout:
        return None, "AI service timed out"
    except Exception as e:
        return None, str(e)

def parse_severity(review_text):
    """Extract severity level from review"""
    review_upper = review_text.upper()
    if 'HIGH' in review_upper or 'CRITICAL' in review_upper or 'SEVERE' in review_upper:
        return 'HIGH'
    elif 'MEDIUM' in review_upper or 'MODERATE' in review_upper:
        return 'MEDIUM'
    elif 'LOW' in review_upper or 'MINOR' in review_upper:
        return 'LOW'
    return 'UNKNOWN'

def has_critical_issues(review_text):
    """Check if review contains critical security issues"""
    critical_keywords = [
        'sql injection',
        'xss',
        'cross-site scripting',
        'command injection',
        'path traversal',
        'remote code execution',
        'buffer overflow',
        'authentication bypass',
        'privilege escalation',
    ]
    
    review_lower = review_text.lower()
    return any(keyword in review_lower for keyword in critical_keywords)

def main():
    """Main pre-commit hook logic"""
    print("\n" + "="*80)
    print("🤖 AI Code Review Pre-Commit Hook")
    print("="*80 + "\n")
    
    # Get staged files
    staged_files = get_staged_files()
    
    if not staged_files:
        print("✅ No staged files to review")
        return 0
    
    # Filter files by supported languages
    reviewable_files = []
    for filepath in staged_files:
        language = get_file_language(filepath)
        if language:
            reviewable_files.append((filepath, language))
    
    if not reviewable_files:
        print("✅ No code files to review")
        return 0
    
    print(f"📋 Found {len(reviewable_files)} file(s) to review:\n")
    
    has_high_severity = False
    review_count = 0
    
    for filepath, language in reviewable_files:
        print(f"🔍 Reviewing: {filepath} ({language})")
        
        # Read file content
        code = read_file_content(filepath)
        if not code:
            continue
        
        # Skip very small files
        if len(code.strip()) < 10:
            print("   ⏭️  Skipped (too small)\n")
            continue
        
        # Review the code
        review, error = review_code(code, language, FOCUS_TYPE)
        
        if error:
            print(f"   ⚠️  {error}")
            print("   ℹ️  Continuing without review\n")
            continue
        
        review_count += 1
        
        # Parse severity
        severity = parse_severity(review)
        has_critical = has_critical_issues(review)
        
        # Print review summary
        if severity == 'HIGH' or has_critical:
            print(f"   🔴 SEVERITY: HIGH")
            has_high_severity = True
        elif severity == 'MEDIUM':
            print(f"   🟡 SEVERITY: MEDIUM")
        else:
            print(f"   🟢 SEVERITY: LOW")
        
        # Print abbreviated review
        lines = review.split('\n')
        preview_lines = [line for line in lines[:5] if line.strip()]
        for line in preview_lines:
            print(f"   {line[:100]}")
        
        if len(lines) > 5:
            print(f"   ... ({len(lines) - 5} more lines)")
        
        print()
    
    # Summary
    print("="*80)
    if review_count == 0:
        print("ℹ️  No reviews performed (service unavailable or files too small)")
        print("✅ Proceeding with commit")
        return 0
    
    print(f"📊 Reviewed {review_count} file(s)")
    
    if has_high_severity and BLOCK_ON_HIGH_SEVERITY:
        print("\n❌ COMMIT BLOCKED: High severity issues detected!")
        print("\nPlease fix the critical issues before committing.")
        print("To bypass this check (not recommended):")
        print("  git commit --no-verify\n")
        return 1
    elif has_high_severity:
        print("\n⚠️  High severity issues detected, but commit allowed")
    else:
        print("\n✅ No critical issues detected")
    
    print("✅ Proceeding with commit\n")
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Review interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Hook error: {e}")
        print("ℹ️  Proceeding with commit anyway\n")
        sys.exit(0)  # Don't block commit on hook errors
