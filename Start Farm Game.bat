@echo off
title Sunny Barn Farm - local server
cd /d "%~dp0"
echo Starting Sunny Barn Farm at http://localhost:8080/  (close this window to stop)
python serve.py 8080
if errorlevel 1 (
  echo.
  echo Python was not found. Install Python from https://www.python.org/ or run:  npx serve -l 8080
  pause
)
