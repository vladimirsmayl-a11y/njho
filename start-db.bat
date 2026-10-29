@echo off
chcp 65001 >nul
set "PGROOT=C:\Users\compu\lvs-pg"

if not exist "%PGROOT%\data\PG_VERSION" (
  echo База не инициализирована: %PGROOT%\data
  pause
  exit /b 1
)

netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul
if not errorlevel 1 (
  echo PostgreSQL уже запущен на порту 5432.
  exit /b 0
)

echo Запускаю PostgreSQL...
"%PGROOT%\pgsql\bin\pg_ctl.exe" -D "%PGROOT%\data" -l "%PGROOT%\postgres.log" -o "-p 5432 -c listen_addresses=127.0.0.1" start
timeout /t 3 >nul
echo Готово.
