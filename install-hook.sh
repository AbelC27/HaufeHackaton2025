#!/bin/bash
# Installation script for Git Pre-Commit Hook

echo "🔧 Installing AI Code Review Pre-Commit Hook..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    echo "   Run this script from the root of your git repository"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Error: Python not found"
    echo "   Please install Python 3"
    exit 1
fi

# Copy the hook
echo "📋 Copying hook to .git/hooks/pre-commit..."
cp pre-commit-hook.py .git/hooks/pre-commit

# Make it executable (Unix/Mac)
if [ "$(uname)" != "Windows_NT" ]; then
    chmod +x .git/hooks/pre-commit
    echo "✅ Hook installed and made executable"
else
    echo "✅ Hook installed"
fi

# Test the hook
echo ""
echo "🧪 Testing hook installation..."
if [ -f ".git/hooks/pre-commit" ]; then
    echo "✅ Hook file exists"
    
    # Check if AI service is running
    echo ""
    echo "🔍 Checking if AI service is running..."
    if curl -s http://127.0.0.1:8000/api/review/ > /dev/null 2>&1; then
        echo "✅ AI service is running"
    else
        echo "⚠️  Warning: AI service not responding"
        echo "   Start it with: cd backend && python manage.py runserver"
    fi
else
    echo "❌ Hook installation failed"
    exit 1
fi

echo ""
echo "="*80
echo "✨ Pre-Commit Hook Installed Successfully!"
echo "="*80
echo ""
echo "The hook will now run automatically on every commit."
echo "It will review staged code and block commits with critical issues."
echo ""
echo "To bypass the hook temporarily:"
echo "  git commit --no-verify"
echo ""
echo "To uninstall:"
echo "  rm .git/hooks/pre-commit"
echo ""
