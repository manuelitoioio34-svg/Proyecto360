# Despliegue y build de imágenes Docker

---

## Arquitectura de contenedores

El proyecto levanta **4 servicios Docker** definidos en `deployment/compose.yml`:

| Servicio | Imagen | Puerto | Descripción |
|---|---|---|---|
| `web` | `pulsechoukairperformancert-web` | 8080 → 80 | Frontend React + Nginx |
| `api` | `pulsechoukairperformancert-api` | 4000 | Backend Express (Node 20) |
| `micro-pagespeed` | `pulsechoukairperformancert-micro-pagespeed` | 3001 | Microservicio Lighthouse |
| `security-service` | `pulsechoukairperformancert-security-service` | 3002 | Análisis de cabeceras HTTP |

La API se comunica internamente con los microservicios. El frontend solo necesita exponer el puerto de Nginx.

---

## Despliegue local (desarrollo)

### 1) Configurar variables de entorno

Copia `.env.example` a `.env` en la raíz y ajusta los valores:

```env
MONGO_URI=mongodb+srv://usuario:pass@cluster.mongodb.net/db
PSI_API_KEY=TU_GOOGLE_PAGESPEED_KEY
EMAIL_USER=correo@dominio.com
EMAIL_PASS=contraseña_app
APP_BASE_URL=http://localhost:8080
```

### 2) Construir y levantar localmente

```powershell
# Windows PowerShell
$env:TAG="dev"; docker compose -f deployment/compose.yml --env-file .env up -d --build
```

```bash
# Linux / Mac
TAG=dev docker compose -f deployment/compose.yml --env-file .env up -d --build
```

### 3) Construir y publicar imágenes en Docker Hub

```powershell
# Requiere: docker login
./scripts/build-and-push.ps1 -Tag 1.0.0
```

Publica las 4 imágenes:
- `docker.io/juancoder/pulsechoukairperformancert-micro-pagespeed:1.0.0`
- `docker.io/juancoder/pulsechoukairperformancert-security-service:1.0.0`
- `docker.io/juancoder/pulsechoukairperformancert-api:1.0.0`
- `docker.io/juancoder/pulsechoukairperformancert-web:1.0.0`

### 4) Desplegar desde imágenes ya publicadas

```powershell
$env:TAG="1.0.0"; docker compose -f deployment/compose.deploy.yml --env-file .env up -d
```

---

## Puertos por defecto

Configurables vía `.env`:

| Variable | Default | Servicio |
|---|---|---|
| `WEB_PORT` | 8080 | Frontend (test) / 80 (prod) |
| `API_PORT` | 4000 | API REST |
| `PS_PORT` | 3001 | Micro Pagespeed |
| `SECURITY_PORT` | 3002 | Security Service |

---

## Pipeline CI/CD — Azure DevOps

El archivo `azure-pipelines.yml` en la raíz del repositorio define el pipeline completo.

### Flujo del pipeline

```
Commit en rama
      │
      ▼
┌─────────────┐
│  Stage 1    │  Build & Push
│  (ambas     │  • docker compose build (4 imágenes)
│   ramas)    │  • docker push → Docker Hub con tag build-{BuildId}
│             │  • tag :latest solo si viene de master
└──────┬──────┘
       │
       ├─── rama test_despliegue ──→ Stage 2: Deploy a Pruebas (puerto 8080)
       │
       └─── rama master ───────────→ Stage 3: Deploy a Producción (puerto 80)
```

### Variables requeridas en Azure DevOps

Configurar en **Pipelines → tu pipeline → Edit → Variables**:

| Variable | Descripción | Secreto |
|---|---|---|
| `DOCKER_HUB_USER` | Usuario Docker Hub (ej. `juancoder`) | No |
| `DOCKER_HUB_TOKEN` | Access Token de Docker Hub | **Sí** |
| `MONGO_URI` | URI de MongoDB Atlas | **Sí** |
| `PSI_API_KEY` | API Key Google PageSpeed | **Sí** |
| `EMAIL_USER` | Correo remitente | No |
| `EMAIL_PASS` | Contraseña / App password | **Sí** |
| `APP_BASE_URL` | URL pública del ambiente (ej. `http://IP:8080`) | No |

> Las variables marcadas como **Sí** deben activar la opción "Keep this value secret" en Azure DevOps.

### Configurar el agente auto-hospedado

El pipeline usa agentes auto-hospedados (self-hosted) porque necesita acceso al servidor donde corren los contenedores Docker.

**Requisitos del servidor del agente:**
- Docker Engine instalado y activo
- Docker Compose v2 (`docker compose` — sin guion)
- Acceso a internet (para pull de Docker Hub)
- El usuario del agente con permisos sobre el socket Docker

**Pasos para registrar el agente:**
1. En Azure DevOps → **Project Settings → Agent Pools → New agent pool** → tipo "Self-hosted"
2. Seguir las instrucciones de instalación del agente en el servidor de pruebas
3. Reemplazar `NOMBRE_AGENTE` en `azure-pipelines.yml` por el nombre del pool creado

### Activar el pipeline

1. Commitear `azure-pipelines.yml` en la rama principal
2. En Azure DevOps → **Pipelines → New Pipeline → Azure Repos Git**
3. Seleccionar el repositorio → seleccionar "Existing Azure Pipelines YAML file"
4. Apuntar a `/azure-pipelines.yml`
5. Configurar las variables secretas antes de ejecutar por primera vez

### Ramas y comportamiento

| Rama | Stage que se ejecuta |
|---|---|
| `test_despliegue` | Build + Deploy a Pruebas |
| `master` | Build + Deploy a Producción + tag :latest en Docker Hub |

---

## Diferencias entre archivos compose

| Archivo | Uso | Diferencia |
|---|---|---|
| `deployment/compose.yml` | Local / CI Build | Incluye sección `build:` para construir imágenes |
| `deployment/compose.deploy.yml` | Servidor de despliegue | Solo `image:` — hace pull, no construye |
