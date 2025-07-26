@echo off
echo ====================================
echo SpendWise Direct Launcher
echo ====================================
echo.
echo Starting application using Node.js directly...
echo (This bypasses npm and PowerShell execution policy restrictions)
echo.

:: Start the React app directly using node
node node_modules\react-scripts\scripts\start.js

pause 