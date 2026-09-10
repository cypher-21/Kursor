@echo off
title Kursor Desktop Server
cd /d "%~dp0server"
echo ==============================================
echo         Kursor Desktop Server (Windows)
echo ==============================================
python -m pip install -r requirements.txt --quiet
python main.py
pause
