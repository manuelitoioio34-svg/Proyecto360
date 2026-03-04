# start-local.ps1
# Script para iniciar todos los servicios en modo desarrollo localmente
# Ejecutar: npm run start:all:ps

Write-Host "🚀 Iniciando todos los servicios..." -ForegroundColor Cyan

# Función para iniciar un servicio en una nueva ventana de PowerShell
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$Directory,
        [string]$Command
    )
    
    Write-Host "→ Iniciando $ServiceName..." -ForegroundColor Green
    
    $scriptBlock = "cd '$Directory'; $Command; pause"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock -WindowStyle Normal
    
    Start-Sleep -Seconds 2
}

# Obtener el directorio raíz del proyecto
$RootPath = Split-Path -Parent $PSScriptRoot

# Iniciar microservicio PageSpeed
Start-Service -ServiceName "PageSpeed Microservice" `
              -Directory "$RootPath\microPagespeed" `
              -Command "npm run dev"

# Iniciar microservicio de seguridad
Start-Service -ServiceName "Security Service" `
              -Directory "$RootPath\security-service" `
              -Command "npm run dev"

# Iniciar backend
Start-Service -ServiceName "Backend API" `
              -Directory "$RootPath\server" `
              -Command "npm run dev"

# Iniciar frontend
Start-Service -ServiceName "Frontend" `
              -Directory "$RootPath" `
              -Command "npm run dev"

Write-Host ""
Write-Host "✅ Todos los servicios han sido iniciados en ventanas separadas" -ForegroundColor Green
Write-Host ""
Write-Host "Servicios corriendo:" -ForegroundColor Yellow
Write-Host "  • PageSpeed Microservice -> http://localhost:3001" -ForegroundColor White
Write-Host "  • Security Service       -> http://localhost:3002" -ForegroundColor White
Write-Host "  • Backend API            -> http://localhost:4000" -ForegroundColor White
Write-Host "  • Frontend               -> http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Para detener los servicios, cierra cada ventana de PowerShell" -ForegroundColor Cyan
