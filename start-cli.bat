@echo off
title Kursor Desktop Server (Terminal Mode)
cd /d "%~dp0server"

echo ==============================================
echo      Kursor Desktop Server (Terminal Mode)
echo ==============================================

python -c "import aiohttp, qrcode, PIL, pynput" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing required packages...
    python -m pip install -r requirements.txt --quiet
)

python main.py --cli
pause
