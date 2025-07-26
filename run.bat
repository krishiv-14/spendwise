@echo off
echo Starting SpendWise Application...

REM Check if Express server is installed
echo Checking dependencies...
IF NOT EXIST node_modules\express (
  echo Installing Express server...
  call npm install express --no-fund --no-audit --loglevel=error
)

REM Run the application using our Express server
echo Starting application with Express server...
node run-app-express.js

REM If there's an error, provide guidance
if %errorlevel% neq 0 (
  echo.
  echo ========================================================
  echo ERROR: Failed to start the application.
  echo ========================================================
  echo.
  echo Possible solutions:
  echo 1. Make sure Node.js is installed
  echo 2. Try running the command: npm install express
  echo 3. Check if the application is built (npm run build)
  echo.
  echo For a completely PowerShell-free solution, create
  echo a 'public' directory and copy your app files there.
  echo.
)

pause 