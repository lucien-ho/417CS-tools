@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1"
if errorlevel 1 (
 echo Installation failed. Keep the error message for support.
 pause
 exit /b 1
)
pause
