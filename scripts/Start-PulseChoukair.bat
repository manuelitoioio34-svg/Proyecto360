@echo off
setlocal enableextensions enabledelayedexpansion

REM ================================================
REM  Pulse Choukair - Starter (Windows)
REM  - Lanza PowerShell con scripts/start-local.ps1
REM  - Abre el navegador al frontend (5174 por defecto)
REM  - Puedes arrastrar este .bat al Escritorio y hacer doble clic
REM ================================================

REM Base del proyecto (carpeta donde está este .bat)
set "BASEDIR=%~dp0"
cd /d "%BASEDIR%"

REM Arranca servicios en una ventana aparte (no bloquea este .bat)
start "PulseChoukair-Services" powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-local.ps1"

REM Pequeña espera para dar tiempo a que arranque el front
REM (ajusta el valor si hace falta)
timeout /t 4 /nobreak >nul

REM URL del front (permite override con variable de entorno PULSE_FRONT_URL)
set "URL=%PULSE_FRONT_URL%"
if "%URL%"=="" set "URL=http://localhost:5174/login"

REM Abre el navegador por defecto
start "" "%URL%"

exit /b 0
