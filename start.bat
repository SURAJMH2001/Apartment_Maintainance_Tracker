@echo off
echo ===================================================
echo Starting Apartment Society Maintenance Tracker...
echo ===================================================

:: Start Backend in a new command window with a specific title
echo Starting Backend API on port 8000...
start "SocietyBackend" cmd /c "title SocietyBackend && cd backend && py -3 start.py"

:: Start Frontend in a new command window with a specific title
echo Starting Frontend UI on port 5173...
start "SocietyFrontend" cmd /c "title SocietyFrontend && cd frontend && node node_modules\vite\bin\vite.js --port 5173"

echo.
echo Both services are starting up in separate windows!
echo Backend API: http://localhost:8000
echo Frontend UI: http://localhost:5173
echo.
echo Waiting for servers to initialize...
ping -n 3 127.0.0.1 > nul

echo Opening application in default browser...
start http://localhost:5173

echo.
echo Application is running!
echo To stop the application, run stop.bat
echo ===================================================
ping -n 3 127.0.0.1 > nul
