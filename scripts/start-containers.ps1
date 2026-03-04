# Definición de parámetros del script
param(
  [switch]$Build,                    # Parámetro opcional tipo switch. Si se pasa -Build, reconstruye las imágenes
  [string]$File = "compose.yml",     # Archivo compose a usar. Por defecto "compose.yml"
  [string]$EnvFile = ".env"          # Archivo de variables de entorno. Por defecto ".env"
)

# Si hay un error, detener la ejecución inmediatamente
$ErrorActionPreference = 'Stop'

# Función auxiliar para verificar si un comando existe en el sistema
function Test-Command {
  param([string]$Name)               # Nombre del comando a verificar
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)  # Retorna $true si existe, $false si no
}

# Configurar TAG por defecto si no está definido
if (-not $env:TAG -or [string]::IsNullOrWhiteSpace($env:TAG)) {
  $env:TAG = 'dev'                   # Usar 'dev' como etiqueta por defecto para las imágenes
}

# Mostrar información de configuración al usuario
Write-Host "Using TAG=$($env:TAG) and compose file '$File'" -ForegroundColor Cyan

# Construir array de argumentos para el comando compose
$composeArgs = @()                   # Inicializar array vacío

# Si existe el archivo .env, agregarlo a los argumentos
if (Test-Path $EnvFile) { 
  $composeArgs += @('--env-file', $EnvFile)  # Agregar --env-file .env
} else { 
  Write-Host "(info) Env file '$EnvFile' not found; using process env only" -ForegroundColor Yellow  # Advertencia si no existe .env
}

# Agregar argumentos básicos: archivo compose, comando up en modo daemon
$composeArgs += @('-f', $File, 'up', '-d')  # -f compose.yml up -d (ejecutar en background)

# Si se especificó -Build, agregar flag para reconstruir imágenes
if ($Build) { $composeArgs += '--build' }    # Agregar --build para reconstruir imágenes Docker

# PRIMER INTENTO: Usar podman-compose (implementación en Python)
if (Test-Command 'podman-compose') {
  Write-Host "Starting with podman-compose..." -ForegroundColor Green
  & podman-compose @composeArgs      # Ejecutar: podman-compose --env-file .env -f compose.yml up -d [--build]
  exit $LASTEXITCODE                 # Salir con el código de salida del comando (0=éxito, >0=error)
}

# SEGUNDO INTENTO: Usar plugin oficial de compose para Podman
if (Test-Command 'podman') {
  try {
    & podman compose version | Out-Null  # Probar si el plugin compose está disponible (descartar salida)
    if ($LASTEXITCODE -eq 0) {           # Si el comando anterior fue exitoso (retornó código 0)
      Write-Host "Starting with 'podman compose'..." -ForegroundColor Green
      & podman compose @composeArgs      # Ejecutar: podman compose --env-file .env -f compose.yml up -d [--build]
      exit $LASTEXITCODE                 # Salir con el código de salida del comando
    }
  } catch {}                             # Si hay excepción, continuar al siguiente intento
}

# TERCER INTENTO: Fallback a Docker Compose como última opción
if (Test-Command 'docker') {
  Write-Host "Starting with docker compose..." -ForegroundColor Green
  & docker compose @composeArgs        # Ejecutar: docker compose --env-file .env -f compose.yml up -d [--build]
  exit $LASTEXITCODE                   # Salir con el código de salida del comando
}

# Si llegó hasta aquí, no se encontró ningún motor de contenedores compatible
Write-Error "No compose-capable engine found (podman-compose, podman compose, or docker compose). Install Podman Desktop or Docker Desktop and retry."