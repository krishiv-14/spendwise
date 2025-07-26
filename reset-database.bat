@echo off
echo ===================================================
echo SpendWise Database Reset
echo ===================================================

echo Stopping any running servers...
taskkill /F /IM node.exe > nul 2>&1

echo.
echo Removing old database...
if exist spendwise.db del /f spendwise.db

echo.
echo Starting server with fresh database...
call npm run server

pause 