@echo off
REM Git Pre-Commit Hook for Windows
REM Copy this to .git\hooks\pre-commit (no extension)

python "%~dp0..\..\pre-commit-hook.py"
exit /b %ERRORLEVEL%
