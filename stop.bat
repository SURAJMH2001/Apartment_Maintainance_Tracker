@echo off
echo ===================================================
echo Stopping Apartment Society Maintenance Tracker...
echo ===================================================

:: Kill by window title created in start.bat
echo Stopping Backend...
taskkill /FI "WINDOWTITLE eq SocietyBackend*" /T /F >nul 2>&1

echo Stopping Frontend...
taskkill /FI "WINDOWTITLE eq SocietyFrontend*" /T /F >nul 2>&1

:: Fallback if window titles weren't exactly matched
:: Killing node if it's running vite on 5173, and python if running start.py on 8000
:: (We skip global kill to avoid killing other projects, but title kill is usually enough)

echo.
echo Application successfully stopped!
echo ===================================================
ping -n 4 127.0.0.1 > nul
