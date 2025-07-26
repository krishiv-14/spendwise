@echo off
echo Starting SpendWise Application...
echo.

REM Run PowerShell with ExecutionPolicy Bypass to start the application
powershell -ExecutionPolicy Bypass -Command "npm start"

REM If the command fails, provide info
if %errorlevel% neq 0 (
  echo.
  echo There was an error running the application.
  echo If you're experiencing PowerShell execution policy issues, try running:
  echo.
  echo powershell -ExecutionPolicy Bypass -Command "npm start"
  echo.
  echo Or set the execution policy to RemoteSigned for your user:
  echo powershell -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned"
  echo.
)

pause 