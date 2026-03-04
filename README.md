# Visión web 360 - Plataforma de Diagnóstico Web Integral

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![React](https://img.shields.io/badge/React-19.1.0-61dafb.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

**Plataforma avanzada de análisis de calidad web con 6 dimensiones de evaluación, streaming en tiempo real y arquitectura de microservicios.**

[Instalación](#-instalación-rápida) • [Documentación](#-documentación-completa) • [Arquitectura](#-arquitectura) • [Desarrollo](#-desarrollo)

</div>

---

## Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Características Principales](#-características-principales)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación Rápida](#-instalación-rápida)
- [Arquitectura](#-arquitectura)
- [Documentación Completa](#-documentación-completa)
- [Desarrollo](#-desarrollo)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contacto](#-contacto)

---

## Descripción General

**Visión web 360** es una plataforma integral de diagnóstico web que analiza **6 pruebas** de calidad utilizando herramientas y estándares reconocidos mundialmente. Diseñada para equipos de desarrollo, QA y gestión de proyectos que requieren evaluaciones técnicas profundas y accionables.

### 6 Dimensiones de Análisis

| Dimensión | Herramienta | Métrica Clave |
|-----------|-------------|---------------|
| Performance | Google Lighthouse | Core Web Vitals (LCP, FID, CLS) |
| Security | Mozilla Observatory + Headers Analysis | Security Score + Findings |
| Accessibility | axe-core (Deque) | WCAG 2.1 Violations |
| Reliability | Custom Uptime Check | Availability + Latency |
| Maintainability | Wappalyzer + Heuristics | Tech Stack + Vulnerabilities |
| Portability | MDN Browser Compat Data | Cross-Browser Compatibility |

### Casos de Uso

 - Auditorías técnicas pre-lanzamiento
 - Monitoreo continuo de calidad web
 - Identificación de brechas de accesibilidad (WCAG)
 - Análisis de seguridad de cabeceras HTTP
 - Evaluación de compatibilidad multi-navegador
 - Detección de tecnologías obsoletas

---

## Características Principales

### Dashboard General con FlipCards Interactivos
- **Gráficas circulares animadas** con métricas en tiempo real
- **Flip 3D interactivo**: Click para ver recomendaciones detalladas
- **Streaming progresivo** (SSE) para feedback instantáneo
- **Score general ponderado** consolidando las 6 dimensiones

### Vistas Individuales por Dimensión
- **Análisis profundo** con métricas específicas
- **Recomendaciones accionables** priorizadas por severidad
- **Histórico de auditorías** con evolución temporal
- **Exportación PDF** de reportes

### Sistema de Roles y Permisos
- **Autenticación JWT** con MongoDB
- **3 roles predefinidos**: Admin, Auditor, Viewer
- **Permisos granulares** por endpoint
- **Logs de auditoría** para acciones administrativas

### Optimizaciones de Rendimiento
- **Caché Redis** para resultados de APIs externas
- **Ejecución paralela** de diagnósticos (Promise.allSettled)
- **Compresión Gzip** en respuestas HTTP
- **Lazy loading** de componentes React

---

## 🛠️ Stack Tecnológico

### Frontend
```
React 19.1 + TypeScript 5.x + Vite 5.x
├── UI: shadcn/ui + TailwindCSS 3
├── Animaciones: Framer Motion 12
├── Gráficas: Recharts 3 + D3.js 7
├── Routing: React Router DOM 7
└── HTTP: Axios 1.11
```

### Backend
```
Node.js 18+ + Express 5 + TypeScript 5.x
├── Database: MongoDB + Mongoose 8
├── Auth: JWT + bcrypt
├── Caché: Redis 4 (opcional)
├── Logger: Pino 9
└── Streaming: Server-Sent Events (SSE)
```

### Microservicios
```
microPagespeed (Puerto 3001)
├── Google Lighthouse 11.x
├── Timeout: 300s
└── Formatos: Desktop + Mobile

security-service (Puerto 3002)
├── Mozilla Observatory API
├── HTTP Headers Analysis
└── Timeout: 120s
```

### APIs Internas (server/utils/apiClients/)
```
axeClient.ts → axe-core 4.8 + jsdom 23
uptimeClient.ts → axios (3 reintentos)
wappalyzerClient.ts → Wappalyzer API + Heurística
portabilityClient.ts → @mdn/browser-compat-data 5.x
```

---

## Instalación Rápida

### Requisitos Previos
- **Node.js** ≥ 18.0.0 ([Descargar](https://nodejs.org/))
- **MongoDB** ≥ 6.0 (local o Atlas) ([Guía](https://www.mongodb.com/docs/manual/installation/))
- **Git** ([Descargar](https://git-scm.com/))
- **PowerShell 5.1+** (Windows) o **Bash** (Linux/Mac)

### Instalación en 3 Pasos

#### 1️⃣ Clonar Repositorio
```powershell
git clone <URL_REPOSITORIO>
cd PulseChoukairPerformanceRT(2)
```

#### 2️⃣ Instalar Dependencias (Automatizado)

**Windows (PowerShell):**
```powershell
.\install-apis.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x install-apis.sh
./install-apis.sh
```

**Manual:**
```powershell
npm install
cd microPagespeed ; npm install ; cd ..
cd security-service ; npm install ; cd ..
cd server ; npm install ; cd ..
```

#### 3️⃣ Configurar Variables de Entorno

**Raíz del proyecto (`.env`):**
```env
VITE_API_URL=http://localhost:3000
VITE_MICROPAGESPEED_URL=http://localhost:3001
VITE_SECURITY_URL=http://localhost:3002
```

**Backend (`server/.env`):**
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/pulse
JWT_SECRET=tu_clave_secreta_muy_segura
REDIS_URL=redis://localhost:6379  # Opcional
WAPPALYZER_API_KEY=tu_api_key     # Opcional
```

**Microservicios:**
- `microPagespeed/.env` → `PORT=3001`
- `security-service/.env` → `PORT=3002`

📖 **Guía completa**: [docs/INSTALACION.md](docs/INSTALACION.md) | [INSTALL_QUICK.md](INSTALL_QUICK.md)

### Iniciar Desarrollo

**Opción 1: Inicio Completo (Backend + Frontend + Microservicios)**
```powershell
npm run start:all
```

**Opción 2: Inicio Manual por Servicios**
```powershell
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev

# Terminal 3 - microPagespeed
cd microPagespeed
npm run dev

# Terminal 4 - security-service
cd security-service
npm run dev
```

**Acceder a la aplicación**: http://localhost:5173

---

## Arquitectura

> **Nota:** El soporte experimental para SQL Server fue revertido; el backend utiliza exclusivamente MongoDB vía Mongoose. Los artefactos de Knex/MSSQL fueron eliminados del repositorio.


### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVEGADOR (Cliente)                      │
│          React 19 + Vite (Puerto 5173)                       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/SSE
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND EXPRESS (Puerto 3000)                   │
│  ┌────────────┬──────────────┬────────────────────────────┐ │
│  │ Controllers│  Middleware  │     Routes                 │ │
│  └────────────┴──────────────┴────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            API Clients (4 Internos)                  │   │
│  │  ├── axeClient (Accesibilidad)                       │   │
│  │  ├── uptimeClient (Fiabilidad)                       │   │
│  │  ├── wappalyzerClient (Mantenibilidad)               │   │
│  │  └── portabilityClient (Portabilidad)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─┬──────────────┬────────────────────────────────────────────┘
  │              │
  │ HTTP         │ HTTP
  ▼              ▼
┌──────────────┐ ┌──────────────────────────────────────────┐
│ MongoDB      │ │   MICROSERVICIOS EXTERNOS                │
│ (Puerto      │ │  ┌────────────────┬────────────────────┐ │
│  27017)      │ │  │ microPagespeed │ security-service   │ │
│              │ │  │ (Puerto 3001)  │ (Puerto 3002)      │ │
│ - Usuarios   │ │  │ - Lighthouse   │ - Observatory      │ │
│ - Auditorías │ │  │ - PageSpeed    │ - Headers Check    │ │
│ - Roles      │ │  └────────────────┴────────────────────┘ │
└──────────────┘ └──────────────────────────────────────────┘
```

### Flujo de Datos: Dashboard General (SSE)

```
1. Usuario ingresa URL → Click en "Analizar"
   ↓
2. Frontend → POST /api/diagnostics/dashboard-stream
   ↓
3. Backend abre conexión SSE (text/event-stream)
   ↓
4. Ejecuta 6 APIs en paralelo (Promise.allSettled):
   ├── microPagespeed (Performance)
   ├── security-service (Security)
   ├── axeClient (Accessibility)
   ├── uptimeClient (Reliability)
   ├── wappalyzerClient (Maintainability)
   └── portabilityClient (Portability)
   ↓
5. Por cada API completada → Evento SSE:
   event: result
   data: { apiName, score, recommendations[] }
   ↓
6. Frontend actualiza FlipCard correspondiente
   ↓
7. Al completar las 6 → Evento SSE:
   event: complete
   data: { overallScore, timestamp }
   ↓
8. Cierra conexión SSE
```

### Estructura de Carpetas Detallada

```
PulseChoukairPerformanceRT(2)/
├── src/                        # Frontend React
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── FlipCard.tsx       # Cards 3D con métricas
│   │   │   ├── CircularGauge.tsx  # Gráfica circular SVG
│   │   │   └── ScoreBar.tsx       # Barra de progreso
│   │   ├── auth/                  # Login, Register
│   │   ├── layout/                # Header, Sidebar, Footer
│   │   └── common/                # Button, Modal, Tooltip
│   ├── pages/
│   │   ├── dashboard/
│   │   │   └── DashBoardGeneral.tsx  # Vista principal
│   │   ├── diagnostics/           # Vistas individuales
│   │   ├── history/               # Histórico de auditorías
│   │   └── admin/                 # Panel administrativo
│   ├── services/
│   │   ├── audit.service.ts       # Llamadas API auditorías
│   │   └── diagnostics.api.ts     # Llamadas API diagnósticos
│   └── hooks/
│       ├── useAudits.ts           # Hook histórico
│       └── useRolePermissions.ts  # Hook permisos
│
├── 📁 server/                     # Backend Express
│   ├── controllers/
│   │   ├── diagnostic.controller.ts  # Lógica diagnósticos + SSE
│   │   ├── auth.controller.ts        # Login, registro
│   │   └── admin.controller.ts       # Gestión usuarios/roles
│   ├── routes/
│   │   ├── diagnostic.routes.ts      # Endpoints diagnósticos
│   │   ├── auth.ts                   # Endpoints auth
│   │   └── admin.ts                  # Endpoints admin
│   ├── middleware/
│   │   └── auth.ts                   # Verificación JWT + permisos
│   ├── database/
│   │   ├── user.ts                   # Modelo Usuario
│   │   ├── esquemaBD.ts              # Modelo Auditoría
│   │   └── rolePermissions.ts        # Modelo Permisos
│   ├── utils/
│   │   ├── apiClients/
│   │   │   ├── axeClient.ts          # ♿ Accesibilidad (axe-core)
│   │   │   ├── uptimeClient.ts       # 📡 Fiabilidad (axios)
│   │   │   ├── wappalyzerClient.ts   # 🔧 Mantenibilidad (Wappalyzer)
│   │   │   └── portabilityClient.ts  # 🌐 Portabilidad (MDN BCD)
│   │   ├── lh.ts                     # Lighthouse helpers
│   │   └── telemetry.ts              # Event tracking
│   └── index.ts                      # Servidor Express principal
│
├── 📁 microPagespeed/             # Microservicio Performance (3001)
│   ├── src/
│   │   ├── index.ts               # Servidor Express
│   │   ├── pagespeed.service.ts   # Lógica Lighthouse
│   │   └── lib/
│   │       └── lh-i18n-es.ts      # Traducción español
│   ├── Dockerfile
│   └── package.json
│
├── 📁 security-service/           # Microservicio Security (3002)
│   ├── src/
│   │   ├── index.ts               # Servidor Express
│   │   ├── routes.ts
│   │   ├── controllers/
│   │   │   └── analyzeController.ts
│   │   └── services/
│   │       ├── observatoryService.ts   # Mozilla Observatory
│   │       └── securityAnalyzer.ts     # Headers analysis
│   ├── Dockerfile
│   └── package.json
│
├── docs/                       # Documentación completa
│   ├── INSTALACION.md             # Guía instalación detallada
│   ├── API_DOCUMENTATION.md       # Referencia APIs + confiabilidad
│   ├── DASHBOARD_GENERAL.md       # Arquitectura dashboard
│   ├── FLIPCARDS_METRICAS.md      # Documentación FlipCards 3D
│   ├── STREAMING_PROGRESIVO.md    # Implementación SSE
│   ├── MEJORAS_APIS.md            # Optimizaciones realizadas
│   └── DEPLOY.md                  # Deployment producción
│
├── scripts/                    # Scripts automatización
│   ├── start-local.sh             # Inicio local completo
│   ├── start-containers.ps1       # Docker containers
│   └── build-and-push.ps1         # CI/CD build
│
├── 📄 DEPENDENCIAS_APIS.md        # Dependencias por API
<!-- INSTALL_QUICK.md removed - quick start consolidated in docs/INSTALACION.md -->
├── 📄 install-apis.ps1            # Script instalación Windows
├── 📄 install-apis.sh             # Script instalación Linux/Mac
├── 📄 package.json                # Dependencias raíz
├── 📄 compose.yml                 # Docker Compose desarrollo
├── 📄 compose.deploy.yml          # Docker Compose producción
└── 📄 README.md                   # Este archivo
```

---

## 📚 Documentación Completa

### 🚀 Inicio Rápido
- **[DEPENDENCIAS_APIS.md](DEPENDENCIAS_APIS.md)** - Dependencias detalladas por API

### 🏗️ Arquitectura y Diseño
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** - Diagrama de componentes y decisiones técnicas *(NUEVO)*
- **[docs/DASHBOARD_GENERAL.md](docs/DASHBOARD_GENERAL.md)** - Dashboard con streaming progresivo
- **[docs/STREAMING_PROGRESIVO.md](docs/STREAMING_PROGRESIVO.md)** - Implementación SSE paso a paso

### 🎨 Características y Features
- **[docs/FLIPCARDS_METRICAS.md](docs/FLIPCARDS_METRICAS.md)** - FlipCards 3D interactivos con Framer Motion
- **[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - Documentación de las 6 APIs y por qué son confiables

### 🔧 Desarrollo
- **[docs/GUIA_DESARROLLO.md](docs/GUIA_DESARROLLO.md)** - Setup entorno, convenciones, testing *(NUEVO)*
- **[docs/MEJORAS_APIS.md](docs/MEJORAS_APIS.md)** - Historial de optimizaciones

### 🚢 Deployment
- **[docs/DEPLOY.md](docs/DEPLOY.md)** - Despliegue en producción (Docker + Railway/Render)

### 📖 Instalación Detallada
- **[docs/INSTALACION.md](docs/INSTALACION.md)** - Guía completa de instalación paso a paso

### 🔍 Troubleshooting
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Solución de problemas comunes *(NUEVO)*

---

## 💻 Desarrollo

### Scripts Disponibles

```powershell
# Frontend
npm run dev              # Vite dev server (5173)
npm run build            # Build producción
npm run preview          # Preview build local
npm run typecheck        # Verificar tipos TypeScript
npm run lint             # ESLint en src/ y server/

# Backend
cd server
npm run dev              # Nodemon con hot-reload
npm run build:server     # Compilar TypeScript

# Microservicios
cd microPagespeed
npm run dev              # Puerto 3001

cd security-service
npm run dev              # Puerto 3002

# Todo junto
npm run start:all        # Backend + Frontend + Microservicios
npm run install:all      # Instalar dependencias en todos los módulos
```

### Convenciones de Código

**TypeScript:**
- Strict mode habilitado
- Interfaces para props de componentes
- Tipos explícitos en funciones públicas

**React:**
- Functional components con hooks
- shadcn/ui para componentes base
- TailwindCSS para estilos
- Lazy loading para rutas

**Backend:**
- Controllers → Lógica de negocio
- Routes → Definición de endpoints
- Middleware → Autenticación/validación
- Utils → Funciones reutilizables

📖 **Guía completa**: [docs/GUIA_DESARROLLO.md](docs/GUIA_DESARROLLO.md)

### Testing

```powershell
# Unit tests (pendiente implementar)
npm test

# E2E tests (pendiente implementar)
npm run test:e2e
```

---

## 🚢 Deployment

### Docker Compose (Recomendado)

**Desarrollo:**
```powershell
docker-compose -f compose.yml up --build
```

**Producción:**
```powershell
docker-compose -f compose.deploy.yml up -d
```

### Plataformas Soportadas
- ✅ **Railway** (recomendado)
- ✅ **Render**
- ✅ **Heroku**
- ✅ **AWS ECS/EC2**
- ✅ **Azure App Service**

📖 **Guía completa**: [docs/DEPLOY.md](docs/DEPLOY.md)

---

## 🐛 Troubleshooting

### Problemas Comunes

#### ❌ Error: "Cannot find module 'axios'"
```powershell
# Ejecutar script de instalación
.\install-apis.ps1

# O manual
npm install axios axe-core jsdom @mdn/browser-compat-data
```

#### ❌ MongoDB connection failed
```powershell
# Verificar que MongoDB esté corriendo
mongod --version

# Iniciar servicio (Windows)
net start MongoDB

# Iniciar servicio (Linux/Mac)
sudo systemctl start mongod
```

#### ❌ Puerto 3000 ya está en uso
```powershell
# Cambiar puerto en server/.env
PORT=3001

# O matar proceso
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

#### ❌ FlipCards no muestran recomendaciones
- Verificar que las 4 APIs internas estén instaladas
- Revisar logs del backend: `server/` → Buscar errores de `axeClient`, `uptimeClient`, etc.
- Comprobar que `generateRecommendations()` está extrayendo `actionPlan`

📖 **Más soluciones**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## 🤝 Contacto

**Equipo de Desarrollo**: Choucair Testing  
**Proyecto**: Pulse - Performance & Quality Platform  
**Versión**: 1.0.0  
**Última actualización**: Enero 2025

---

<div align="center">

**⭐ ¿Te resultó útil? Considera dejar una estrella en el repositorio**

[📖 Documentación](#-documentación-completa) • [🐛 Reportar Bug](./docs/TROUBLESHOOTING.md) • [💡 Sugerir Feature](./docs/GUIA_DESARROLLO.md)

</div>

---

## 📁 Project Structure

PulseChoukairPerformanceRT(2) # 
├── docs # 
│   ├── API_DOCUMENTATION.md # 
│   ├── DASHBOARD_GENERAL.md # 
│   ├── DEPLOY.md # 
│   ├── FLIPCARDS_METRICAS.md # 
│   ├── INSTALACION.md # 
│   ├── MEJORAS_APIS.md # 
│   └── STREAMING_PROGRESIVO.md # 
├── microPagespeed # 
│   ├── src # 
│   │   ├── lib # 
│   │   │   └── lh-i18n-es.ts # 
│   │   ├── index.ts # 
│   │   └── pagespeed.service.ts # 
│   ├── .dockerignore # 
│   ├── .env # 
│   ├── Dockerfile # 
│   ├── package-lock.json # 
│   ├── package.json # 
│   ├── tsconfig.json # 
│   └── tsconfig.microPagespeed.json # 
├── public # 
│   ├── LogoChoucair.png # 
│   └── vite.svg # 
├── scripts # 
│   ├── build-and-push.ps1 # 
│   ├── compose-up.sh # 
│   ├── start-containers.ps1 # 
│   └── start-local.sh # 
├── security-service # 
│   ├── src # 
│   │   ├── controllers # 
│   │   │   └── analyzeController.ts # 
│   │   ├── services # 
│   │   │   ├── observatoryService.ts # 
│   │   │   └── securityAnalyzer.ts # 
│   │   ├── utils # 
│   │   ├── index.ts # 
│   │   └── routes.ts # 
│   ├── .env # 
│   ├── Dockerfile # 
│   ├── package-lock.json # 
│   ├── package.json # 
│   ├── README.md # 
│   └── tsconfig.json # 
├── server # 
│   ├── controllers # 
│   │   ├── admin.controller.ts # 
│   │   ├── auditHistory.controller.ts # 
│   │   ├── auth.controller.ts # 
│   │   ├── diagnostic.controller.ts # 
│   │   └── FormController.ts # 
│   ├── database # 
│   │   ├── adminLog.ts # 
│   │   ├── adminVisit.ts # 
│   │   ├── esquemaBD.ts # 
│   │   ├── mongo.ts # 
│   │   ├── mongoDrivers.ts # 
│   │   ├── roleAudit.ts # 
│   │   ├── rolePermissions.ts # 
│   │   ├── securitySchema.ts # 
│   │   ├── telemetryEvent.ts # 
│   │   └── user.ts # 
│   ├── middleware # 
│   │   └── auth.ts # 
│   ├── routes # 
│   │   ├── admin.ts # 
│   │   ├── auth.ts # 
│   │   ├── diagnostic.routes.ts # 
│   │   ├── formRoutes.ts # 
│   │   ├── securityRoutes.ts # 
│   │   └── send-diagnostic.ts # 
│   ├── utils # 
│   │   ├── apiClients # 
│   │   │   ├── axeClient.ts # 
│   │   │   ├── portabilityClient.ts # 
│   │   │   ├── uptimeClient.ts # 
│   │   │   └── wappalyzerClient.ts # 
│   │   ├── lh.ts # 
│   │   ├── lighthouseColors.ts # 
│   │   ├── permissionsCatalog.ts # 
│   │   └── telemetry.ts # 
│   ├── .env # 
│   ├── Dockerfile # 
│   ├── index.ts # 
│   ├── package-lock.json # 
│   ├── package.json # 
│   ├── test-axios.js # 
│   └── tsconfig.server.json # 
├── src # 
│   ├── assets # 
│   │   ├── img-indicadores # 
│   │   │   ├── circulo-azul.jpg # 
│   │   │   ├── circulo-rojo.png # 
│   │   │   └── circulo-verde.jpg # 
│   │   └── react.svg # 
│   ├── components # 
│   │   ├── auth # 
│   │   │   ├── AuthContext.tsx # 
│   │   │   ├── ForgotPassword.tsx # 
│   │   │   ├── Login.tsx # 
│   │   │   ├── Register.tsx # 
│   │   │   ├── ResetPassword.tsx # 
│   │   │   └── VerifyEmail.tsx # 
│   │   ├── common # 
│   │   │   ├── CircularGauge.tsx # 
│   │   │   ├── EmailPdfBar.tsx # 
│   │   │   └── ScrollToTop.tsx # 
│   │   ├── dashboard # 
│   │   │   ├── ActionPlanPanel.tsx # 
│   │   │   ├── Dashboard.tsx # 
│   │   │   ├── FlipCard.tsx # 
│   │   │   ├── MetricsDashboard.tsx # 
│   │   │   └── SecurityDiagnosticoPanel.tsx # 
│   │   ├── forms # 
│   │   │   └── Formulario.tsx # 
│   │   ├── layout # 
│   │   │   └── Navbar.tsx # 
│   │   ├── CategoryBreakdown.tsx # 
│   │   ├── DiagnosticoView.tsx # 
│   │   ├── HistoricoView.tsx # 
│   │   ├── SecurityHistoricoView.tsx # 
│   │   └── SecurityScoreWidget.tsx # 
│   ├── entities # 
│   │   └── audit # 
│   │       └── model # 
│   │           ├── schema.ts # 
│   │           └── store.ts # 
│   ├── features # 
│   │   └── run-audit # 
│   │       ├── api # 
│   │       │   └── index.ts # 
│   │       ├── model # 
│   │       │   └── useRunAudit.ts # 
│   │       └── ui # 
│   │           └── RunAuditCard.tsx # 
│   ├── hooks # 
│   │   ├── useAudits.ts # 
│   │   └── useRolePermissions.ts # 
│   ├── pages # 
│   │   ├── admin # 
│   │   │   ├── logs # 
│   │   │   │   └── useLogSummary.ts # 
│   │   │   ├── telemetry # 
│   │   │   │   └── useTelemetrySummary.ts # 
│   │   │   ├── index.tsx # 
│   │   │   ├── Logs.tsx # 
│   │   │   ├── PermissionsManager.tsx # 
│   │   │   ├── Telemetry.tsx # 
│   │   │   ├── Traceability.tsx # 
│   │   │   ├── UserDetailOverrides.tsx # 
│   │   │   └── Users.tsx # 
│   │   ├── dashboard # 
│   │   │   └── DashBoardGeneral.tsx # 
│   │   ├── diagnostics # 
│   │   │   └── index.tsx # 
│   │   ├── full-check # 
│   │   │   └── DashboardCalidadWeb.tsx # 
│   │   ├── history # 
│   │   │   └── index.tsx # 
│   │   ├── run-audit # 
│   │   │   └── index.tsx # 
│   │   ├── security-history # 
│   │   │   └── index.tsx # 
│   │   └── settings # 
│   │       └── index.tsx # 
│   ├── processes # 
│   │   └── audit-run-flow # 
│   │       └── RunAuditFlow.tsx # 
│   ├── services # 
│   │   ├── audit.service.ts # 
│   │   ├── auditClient.ts # 
│   │   └── diagnostics.api.ts # 
│   ├── shared # 
│   │   ├── api # 
│   │   │   └── base.ts # 
│   │   ├── lib # 
│   │   │   └── utils.ts # 
│   │   ├── model # 
│   │   │   └── slices # 
│   │   │       ├── audit-history.ts # 
│   │   │       └── ui.ts # 
│   │   ├── ui # 
│   │   │   ├── badge.tsx # 
│   │   │   ├── button.tsx # 
│   │   │   ├── card.tsx # 
│   │   │   ├── checkbox.tsx # 
│   │   │   ├── input.tsx # 
│   │   │   ├── select.tsx # 
│   │   │   ├── table.tsx # 
│   │   │   └── tabs.tsx # 
│   │   ├── validation # 
│   │   │   └── index.ts # 
│   │   ├── permissions.ts # 
│   │   ├── settings.ts # 
│   │   └── telemetry.ts # 
│   ├── styles # 
│   │   ├── action-plan-panel.tw.css # 
│   │   ├── diagnostico.tw.css # 
│   │   ├── formulario.tw.css # 
│   │   ├── historico.tw.css # 
│   │   ├── navbar.tw.css # 
│   │   └── pdf-scope.css # 
│   ├── workers # 
│   │   └── securityWorker.ts # 
│   ├── App.css # 
│   ├── App.tsx # 
│   ├── cacheKey.ts # 
│   ├── Dockerfile.web # 
│   ├── env.d.ts # 
│   ├── index.css # 
│   ├── index.ts # 
│   ├── main.tsx # 
│   ├── nginx.conf # 
│   ├── pagespeed.worker.ts # 
│   ├── queue.js # 
│   ├── queue.ts # 
│   ├── redisClient.js # 
│   ├── redisClient.ts # 
│   ├── setupSafeFetch.ts # 
│   └── tsconfig.json # 
├── .dockerignore # 
├── .env # 
├── .env.example # 
├── .eslintignore # 
├── .gitignore # 
├── audit_raw.json # 
├── components.json # 
├── compose.deploy.yml # 
├── compose.yml # 
├── DEPENDENCIAS_APIS.md # 
├── DEPENDENCIAS.md # 
├── eslint.config.js # 
├── history.json # 
├── index.html # 
├── INSTALL_QUICK.md # 
├── install-apis.ps1 # 
├── install-apis.sh # 
├── package-lock.json # 
├── package.json # 
├── postcss.config.cjs # 
├── processed.json # 
├── README.md # 
├── tailwind.config.cjs # 
├── tailwindcss-23524.log # 
├── tsconfig.json # 
├── tsconfig.worker.json # 
└── vite.config.ts # 

Respuesta (resumen simplificado):

Este repositorio incorpora un nuevo endpoint backend para ejecutar cuatro diagnósticos adicionales sobre una URL pública y almacenar los resultados en MongoDB:

- Usabilidad/Accesibilidad (axe-core)
- Fiabilidad (disponibilidad y tiempo de respuesta)
- Mantenibilidad (detección de stack con Wappalyzer o heurística local)
- Portabilidad (compatibilidad de features con navegadores modernos usando MDN BCD)

### Endpoint

- POST `/api/diagnostics/full-check`

Body JSON:

```
{ "url": "https://www.example.com" }
```

Respuesta (resumen simplificado):

```
{
	"url": "https://www.example.com",
	"summary": {
		"accessibilityScore": 0.92,
		"uptimeMs": 450,
		"stackItems": 7,
		"compatibleBrowsers": ["chrome","edge","firefox"]
	},
	"results": {
		"usability": { "metrics": {"score": 0.92, "violations": 2 }, ... },
		"fiability": { "metrics": {"availability": 100, "avgResponseTime": 450 }, ... },
		"maintainability": { "metrics": {"stackItems": 7 }, ... },
		"portability": { "metrics": {"compatibleBrowsers": [...], "incompatibilities": 2 }, ... }
	}
}
```

Los cuatro resultados se guardan en la colección `audits` con `type` en {`usability`, `fiability`, `maintainability`, `portability`}.

### Implementación

- Clientes en `server/utils/apiClients/`:
	- `axeClient.ts` (axe-core + jsdom)
	- `uptimeClient.ts` (axios simple)
	- `wappalyzerClient.ts` (Wappalyzer API o heurística local)
	- `portabilityClient.ts` (@mdn/browser-compat-data)
- Controlador: `server/controllers/diagnostic.controller.ts` → `fullCheck`
- Ruta: `server/routes/diagnostic.routes.ts` → `POST /full-check`
- Montaje: `server/index.ts` → `app.use('/api/diagnostics', diagnosticRoutes)`

### Dependencias

Se agregaron al `server/package.json`:

- `axe-core`, `jsdom`, `@mdn/browser-compat-data`
- Dev: `@types/jsdom`

Instalación:

```
# desde la raíz del repo
npm --prefix server install
```

Variables opcionales:

- `WAPPALYZER_API_KEY`: Si se define, se usa la API oficial de Wappalyzer.

### Notas y límites

- axe-core con jsdom analiza el DOM estático (no ejecuta el JS del sitio). Para SPAs con renderizado tardío, considera un runner con navegador real (Puppeteer/Playwright) en el futuro.
- La verificación de fiabilidad por defecto usa una única solicitud HTTP. Para monitoreo real en producción, integra Better Uptime u otro servicio externo.
- La detección de stack sin API es heurística; la API de Wappalyzer ofrece resultados más precisos.
- La portabilidad usa un conjunto reducido de features (ES modules, CSS Grid y Flex) y puede ampliarse.
```



