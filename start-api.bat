@echo off
chcp 65001 >nul
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
  echo Создаю окружение и ставлю зависимости...
  py -m venv .venv
  ".venv\Scripts\python.exe" -m pip install --retries 10 --timeout 60 -r requirements.txt
  if errorlevel 1 (echo Не удалось установить зависимости. & pause & exit /b 1)
)

echo API: http://127.0.0.1:8000
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
