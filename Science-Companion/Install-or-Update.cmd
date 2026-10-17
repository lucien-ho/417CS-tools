@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1"
if errorlevel 1 (
  echo Install/update failed. Please copy the error shown above.
  pause
  exit /b 1
)
echo Update complete. Reload Science Companion in edge://extensions, then refresh Science.
pause
