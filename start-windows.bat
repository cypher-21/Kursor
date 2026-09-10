@echo off
title Mousely Desktop Server
cd /d "%~dp0linux-server"
echo ==============================================
echo       Mousely Desktop Server (Windows/Linux)
echo ==============================================
python -m pip install -r requirements.txt --quiet
python main.py
pause
