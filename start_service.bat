@echo off
echo 🚀 Starting WhatsApp ML Helper Service...
echo.

cd /d "%~dp0service"

echo 📦 Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo 💡 Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

echo 📥 Installing/updating dependencies...
pip install -r requirements.txt

echo.
echo 🚀 Starting ML service...
echo 📍 Service will be available at: http://127.0.0.1:8000
echo 📊 API Documentation: http://127.0.0.1:8000/docs
echo 🔧 Press Ctrl+C to stop the service
echo.

python start_service.py

pause
