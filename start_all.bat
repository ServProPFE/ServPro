@echo off
echo.
echo ==========================================
echo 🚀 ServPro AI Chatbot - Full Startup
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: $(node --version)
echo ✅ Python found: $(python --version)
echo.

REM Start Python AI Service
echo Starting Python AI Service on port 5000...
cd python_ai
start "Python AI Service" cmd /k "python -m pip install -r requirements.txt & python app.py"
timeout /t 3 /nobreak

REM Return to ServPro
cd ..\..

REM Install Node dependencies if needed
echo Installing Node.js dependencies...
cd ServProBackend
call npm install >nul 2>&1
cd ..

REM Start Node.js Backend
echo Starting Node.js Backend on port 4000...
cd ServProBackend
start "Node.js Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak
cd ..

REM Start Frontend
echo Starting React Frontend on port 5173...
cd ServProFrontEnd
start "React Frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo ✅ All services started!
echo ==========================================
echo.
echo 📍 Services:
echo   • Python AI Service: http://localhost:5000
echo   • Node.js Backend: http://localhost:4000
echo   • React Frontend: http://localhost:5173
echo.
echo 🧪 Test the chatbot:
echo   1. Open http://localhost:5173 in your browser
echo   2. Login with test account
echo   3. Click the chatbot button (bottom-right)
echo   4. Ask for services
echo.
echo 📋 Test Queries:
echo   • "I need a plumber"
echo   • "My AC is broken"
echo   • "أحتاج كهربائي" (Arabic)
echo.
echo Press Ctrl+C in any terminal to stop services
pause
