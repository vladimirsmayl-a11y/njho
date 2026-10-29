@echo off
chcp 65001 >nul
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
  echo Сначала запусти start-api.bat — он поставит зависимости.
  pause
  exit /b 1
)

".venv\Scripts\python.exe" -m bot.main
pause
