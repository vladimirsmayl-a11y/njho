@echo off
chcp 65001 >nul
cd /d "%~dp0"

call "%~dp0start-db.bat"

start "LVS API" cmd /k "%~dp0start-api.bat"
timeout /t 5 >nul
start "LVS Сайт" cmd /k "%~dp0start-site.bat"
timeout /t 3 >nul

findstr /R /C:"^BOT_TOKEN=." "%~dp0backend\.env" >nul
if errorlevel 1 (
  echo Бот не запущен: в backend\.env не заполнен BOT_TOKEN.
) else (
  start "LVS Бот" cmd /k "%~dp0start-bot.bat"
)

echo.
echo Сайт: http://localhost:3000
echo API:  http://127.0.0.1:8000/health
