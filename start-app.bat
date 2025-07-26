@echo off
echo ===================================================
echo SpendWise Application Starter
echo ===================================================

echo Stopping any running servers...
taskkill /F /IM node.exe > nul 2>&1

echo.
echo Starting both backend and frontend...
echo.
echo Username: admin
echo Password: admin123
echo.

npm run dev

pause 