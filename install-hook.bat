@echo off
echo.
echo ============================================================
echo    Installing AI Code Review Pre-Commit Hook (Windows)
echo ============================================================
echo.

REM Check if we're in a git repository
if not exist ".git" (
    echo [ERROR] Not a git repository
    echo Please run this script from the root of your git repository
    pause
    exit /b 1
)

REM Check if Python is available
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found in PATH
    echo Please install Python and add it to your PATH
    pause
    exit /b 1
)

echo [1/4] Checking Python version...
python --version

REM Install requests if needed
echo.
echo [2/4] Ensuring required packages are installed...
python -m pip install --quiet requests

REM Create the hook with proper shebang for Windows
echo.
echo [3/4] Creating pre-commit hook...

REM Copy the hook to .git/hooks/
copy /Y pre-commit-hook.py .git\hooks\pre-commit >nul

REM Create a wrapper batch file that calls Python explicitly
echo @echo off > .git\hooks\pre-commit.bat
echo python "%~dp0pre-commit" %%* >> .git\hooks\pre-commit.bat

echo [SUCCESS] Hook files created

REM Test the hook
echo.
echo [4/4] Testing hook installation...
if exist ".git\hooks\pre-commit" (
    echo [SUCCESS] Hook file exists
) else (
    echo [ERROR] Hook installation failed
    pause
    exit /b 1
)

REM Check if AI service is running
echo.
echo Checking if AI service is running...
curl -s http://127.0.0.1:8000/api/review/ >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] AI service is running
) else (
    echo [WARNING] AI service not responding
    echo          Start it with: cd backend ^&^& python manage.py runserver
)

echo.
echo ============================================================
echo    Pre-Commit Hook Installed Successfully!
echo ============================================================
echo.
echo The hook will now run automatically on every commit.
echo It will review staged code and block commits with critical issues.
echo.
echo To bypass the hook temporarily:
echo   git commit --no-verify
echo.
echo To uninstall:
echo   del .git\hooks\pre-commit
echo   del .git\hooks\pre-commit.bat
echo.
pause
