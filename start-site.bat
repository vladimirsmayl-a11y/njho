@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"

if not exist "node_modules\next" (
  echo Ставлю зависимости сайта...
  npm install --no-audit --no-fund --fetch-retries=10
  if errorlevel 1 (echo Не удалось установить зависимости. & pause & exit /b 1)
)

echo Сайт: http://localhost:3000
npm run dev
pause
