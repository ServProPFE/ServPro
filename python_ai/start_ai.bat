@echo off
echo.
echo ========================================
echo Starting Python AI Chatbot Service...
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

REM Install dependencies
echo Installing Python dependencies...
python -m pip install -r requirements.txt

REM Start the Flask app
echo.
echo Starting Flask Application...
echo Listen on http://localhost:5000
echo.
python app.py

pause
