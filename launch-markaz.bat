@echo off
setlocal
cd /d "%~dp0"
set "URL=http://localhost:5173/"

where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org then click this file again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing packages once...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

curl -sf -o nul "%URL%" >nul 2>&1
if errorlevel 1 (
  start "Markaz local" cmd /k "cd /d "%~dp0" && npm run dev"
  timeout /t 5 /nobreak >nul
)

start "" "%URL%"
endlocal
