@echo off
title GERD Website Server
cd /d "%~dp0"
echo Starting the GERD website...
echo.
echo Keep this window open while you use the website.
echo If the browser does not open automatically, go to:
echo http://localhost:4173
echo.
start "" "http://localhost:4173"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\server\server.ps1" -Port 4173
echo.
echo The GERD website server has stopped.
pause
