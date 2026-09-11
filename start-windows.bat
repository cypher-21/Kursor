@echo off
cd /d "%~dp0server"

if "%1"=="--cli" goto :cli
if "%1"=="--terminal" goto :cli

REM Quick check if dependencies are installed
python -c "import aiohttp, qrcode, PIL, pynput" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing required packages...
    python -m pip install -r requirements.txt --quiet
)

REM If pythonw exists, launch GUI without terminal window and close CMD
where pythonw >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "" pythonw main.py
    exit /b 0
)

:cli
title Kursor Desktop Server
echo ==============================================
echo         Kursor Desktop Server (Windows)
echo ==============================================
python main.py
pause

