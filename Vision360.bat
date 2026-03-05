@echo off
setlocal enableextensions enabledelayedexpansion

REM ════════════════════════════════════════════════
REM  Visión Web 360° — Lanzador principal
REM  Inicia todos los servicios y abre el navegador
REM ════════════════════════════════════════════════

REM Directorio raíz del proyecto (donde está este .bat)
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

cd /d "%ROOT%"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        Visión Web 360° — Choukair    ║
echo  ║     Digital Assets Reliability       ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Iniciando servicios, por favor espera...
echo.

REM Lanza los servicios en una ventana independiente
start "Vision360-Servicios" powershell.exe -NoProfile -ExecutionPolicy Bypass ^
    -File "%ROOT%\scripts\start-local.ps1"

REM Espera a que los servicios arranquen (ajusta si tu máquina es más lenta)
timeout /t 8 /nobreak >nul

REM URL de la aplicación (se puede sobreescribir con la variable de entorno VISION360_URL)
set "URL=%VISION360_URL%"
if "%URL%"=="" set "URL=http://localhost:5173/login"

echo  Abriendo %URL% en el navegador...
start "" "%URL%"

exit /b 0
