@echo off
echo ===================================================
echo SpendWise Application Restart
echo ===================================================
echo Stopping any running servers...

taskkill /F /IM node.exe >nul 2>&1

echo Starting both backend and frontend...

echo Username: admin
echo Password: admin123

npm run dev 