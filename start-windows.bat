@echo off
cd /d "%~dp0server"

REM Switch to the server folder and forward every argument (e.g. --cli, --port 9000)
python -c "import aiohttp, qrcode, PIL, pynput" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing required packages...
    python -m pip install -r requirements.txt --quiet
)

REM If pythonw exists, launch GUI without terminal window and close CMD
if "%~1"=="" (
    where pythonw >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        start "" pythonw main.py
        exit /b 0
    )
)

title Kursor Desktop Server
echo ==============================================
echo         Kursor Desktop Server (Windows)
echo ==============================================
python main.py %*
pause

