@echo off
title Stock Dashboard

echo Starting backend...
start "Stock Dashboard - Backend" /B cmd /c "cd /d "%~dp0backend" && python main.py"

echo Starting frontend...
start "Stock Dashboard - Frontend" /B cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo Press any key to stop both...
echo.
pause >nul

echo Stopping...
taskkill /f /fi "WINDOWTITLE eq Stock Dashboard - Backend" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Stock Dashboard - Frontend" >nul 2>&1
echo Done.
