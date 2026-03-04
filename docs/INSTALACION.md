# 🚀 Guía de Instalación - PulseChoukair Performance RT

## 📋 Requisitos Previos

### Software Obligatorio
- **Node.js**: v18.x o superior (LTS recomendado)
- **npm**: v9.x o superior (viene con Node.js)
- **MongoDB**: v6.x o superior (local o Atlas)
- **Git**: Para clonar el repositorio

### Opcionales (para desarrollo)
- **Docker**: Si prefieres usar contenedores
- **VS Code**: Editor recomendado con extensiones TypeScript

---

## 📦 Dependencias del Proyecto

### 1. Backend (Node.js + Express + TypeScript)

```bash
cd server
npm install
```

**Dependencias principales**:
```json
{
  "express": "^4.18.x",
  "mongoose": "^8.x",
  "axios": "^1.6.x",
  "cors": "^2.8.x",
  "dotenv": "^16.x",
  "axe-core": "^4.8.x",
  "jsdom": "^23.x"
}
```

**Dependencias de desarrollo**:
```json
{
  "typescript": "^5.3.x",
  "@types/node": "^20.x",
  "@types/express": "^4.17.x",
  "ts-node": "^10.x",
  "nodemon": "^3.x"
}
```

### 2. Frontend (React + TypeScript + Vite)

```bash
cd src  # o raíz del proyecto
npm install
```

**Dependencias principales**:
```json
{
  "react": "^18.2.x",
  "react-dom": "^18.2.x",
  "react-router-dom": "^6.20.x",
  "framer-motion": "^10.16.x",
  "lucide-react": "^0.294.x",
  "recharts": "^2.10.x",
  "clsx": "^2.0.x",
  "tailwind-merge": "^2.1.x"
}
```

**Dependencias de desarrollo**:
```json
{
  "vite": "^5.0.x",
  "typescript": "^5.2.x",
  "@types/react": "^18.2.x",
  "@types/react-dom": "^18.2.x",
  "tailwindcss": "^3.3.x",
  "autoprefixer": "^10.4.x",
  "postcss": "^8.4.x",
  "eslint": "^8.55.x"
}
```

### 3. Microservicios

#### 🚀 microPagespeed (Puerto 3001)
```bash
cd microPagespeed
npm install
```

**Dependencias**:
```json
{
  "express": "^4.18.x",
  "axios": "^1.6.x",
  "cors": "^2.8.x",
  "dotenv": "^16.x"
}
```

**Variables de entorno** (`.env`):
```env
PORT=3001
PAGESPEED_API_KEY=tu_google_pagespeed_api_key
```

#### 🛡️ security-service (Puerto 3002)
```bash
cd security-service
npm install
```

**Dependencias**:
```json
{
  "express": "^4.18.x",
  "axios": "^1.6.x",
  "cors": "^2.8.x",
  "dotenv": "^16.x"
}
```

**Variables de entorno** (`.env`):
```env
PORT=3002
```

---

## 🔧 Configuración de Variables de Entorno

### Backend Principal (`server/.env`)

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/pulseDB
# o para MongoDB Atlas:
# MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/pulseDB

# Puertos
PORT=5000

# Microservicios
MS_PAGESPEED_URL=http://localhost:3001
MS_SECURITY_URL=http://localhost:3002

# Timeouts (milisegundos)
PAGESPEED_TIMEOUT_MS=300000
SECURITY_TIMEOUT_MS=120000

# APIs externas (opcionales)
WAPPALYZER_API_KEY=tu_wappalyzer_api_key
BETTER_UPTIME_API_TOKEN=tu_better_uptime_token

# Ambiente
NODE_ENV=development
```

### Frontend (`.env` o `.env.local`)

```env
# Backend URL
VITE_API_URL=http://localhost:5000

# Modo de desarrollo
VITE_DEV_MODE=true
```

---

## 📥 Instrucciones de Instalación Completa

### Opción 1: Instalación Manual

```bash
# 1. Clonar el repositorio
git clone https://github.com/JuanMT777/Proyecto-de-pruebas-de-rendimiento.git
cd Proyecto-de-pruebas-de-rendimiento

# 2. Instalar dependencias del frontend
npm install

# 3. Instalar dependencias del backend
cd server
npm install
cd ..

# 4. Instalar dependencias de microPagespeed
cd microPagespeed
npm install
cd ..

# 5. Instalar dependencias de security-service
cd security-service
npm install
cd ..

# 6. Configurar variables de entorno
# Crear archivos .env en cada carpeta según las plantillas arriba

# 7. Iniciar MongoDB (si es local)
mongod --dbpath /ruta/a/tu/db

# 8. Iniciar servicios en terminales separadas:

# Terminal 1: Backend principal
cd server
npm run dev

# Terminal 2: microPagespeed
cd microPagespeed
npm run dev

# Terminal 3: security-service
cd security-service
npm run dev

# Terminal 4: Frontend
npm run dev
```

### Opción 2: Usando Docker (si está configurado)

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

---

## 🗄️ Configuración de MongoDB

### MongoDB Local

```bash
# Instalar MongoDB Community Edition
# Windows: https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt install mongodb

# Iniciar servicio
# Windows: net start MongoDB
# Mac/Linux: mongod

# Verificar conexión
mongosh
> show dbs
```

### MongoDB Atlas (Cloud)

1. Crear cuenta en https://www.mongodb.com/cloud/atlas
2. Crear cluster gratuito
3. Configurar usuario y contraseña
4. Whitelist IP (0.0.0.0/0 para desarrollo)
5. Copiar connection string a `MONGO_URI`

---

## 🔑 APIs Externas (Opcionales)

### Google PageSpeed API
1. Ir a https://developers.google.com/speed/docs/insights/v5/get-started
2. Crear API Key en Google Cloud Console
3. Agregar a `microPagespeed/.env` como `PAGESPEED_API_KEY`

### Wappalyzer API
1. Registrarse en https://www.wappalyzer.com/api/
2. Obtener API key
3. Agregar a `server/.env` como `WAPPALYZER_API_KEY`

### Better Uptime (Opcional)
1. Registrarse en https://betteruptime.com/
2. Crear token de API
3. Agregar a `server/.env` como `BETTER_UPTIME_API_TOKEN`

---

## ✅ Verificación de Instalación

```bash
# 1. Verificar Node.js
node --version  # debe ser >= v18.x
npm --version   # debe ser >= v9.x

# 2. Verificar MongoDB
mongosh --version  # debe ser >= v2.x

# 3. Verificar servicios corriendo
# Backend: http://localhost:5000/api/health
# microPagespeed: http://localhost:3001/health
# security-service: http://localhost:3002/health
# Frontend: http://localhost:5173

# 4. Verificar TypeScript
npm run typecheck --silent  # Exit Code: 0
```

---

## 🚀 Scripts Disponibles

### Frontend
```bash
npm run dev         # Desarrollo con Vite
npm run build       # Build para producción
npm run preview     # Preview del build
npm run typecheck   # Verificar TypeScript
npm run lint        # Linter ESLint
```

### Backend (server/)
```bash
npm run dev         # Desarrollo con nodemon
npm run build       # Compilar TypeScript
npm run start       # Producción
npm run typecheck   # Verificar TypeScript
```

### Microservicios
```bash
npm run dev         # Desarrollo
npm run start       # Producción
```

---

## 🐛 Troubleshooting

### Error: MongoDB connection failed
```bash
# Solución 1: Verificar que MongoDB esté corriendo
mongod --version

# Solución 2: Verificar MONGO_URI en .env
# Debe ser: mongodb://localhost:27017/pulseDB
```

### Error: Puerto ya en uso
```bash
# Encontrar proceso usando el puerto
# Windows:
netstat -ano | findstr :5000

# Mac/Linux:
lsof -i :5000

# Matar proceso
# Windows:
taskkill /PID <PID> /F

# Mac/Linux:
kill -9 <PID>
```

### Error: Module not found
```bash
# Limpiar caché y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Error: TypeScript compilation failed
```bash
# Verificar versión de TypeScript
npm list typescript

# Reinstalar
npm install -D typescript@latest
```

---

## 📚 Estructura del Proyecto

```
PulseChoukairPerformanceRT(2)/
├── src/                    # Frontend React
│   ├── components/         # Componentes UI
│   ├── pages/             # Páginas/Rutas
│   ├── services/          # Clientes API
│   └── main.tsx           # Entry point
├── server/                 # Backend Express
│   ├── controllers/       # Lógica de negocio
│   ├── database/          # Modelos Mongoose
│   ├── routes/            # Rutas API
│   └── utils/             # Utilidades/API clients
├── microPagespeed/        # Microservicio PageSpeed
│   ├── src/
│   └── package.json
├── security-service/      # Microservicio Security
│   ├── src/
│   └── package.json
├── docs/                  # Documentación
├── public/                # Assets estáticos
└── package.json           # Dependencias root
```

---

## 🎯 Nueva Funcionalidad: FlipCards con Recomendaciones

Esta versión incluye **FlipCards 3D interactivos** en el Dashboard General que muestran:

- **Frente**: Gráfica circular con métrica y score
- **Reverso**: Recomendaciones prioritarias extraídas de cada API

### APIs que proveen recomendaciones:

1. **Performance** (PageSpeed)
   - Extrae métricas: LCP, TBT, FCP, CLS, Speed Index
   - Genera recomendaciones específicas según umbrales

2. **Security** (Headers HTTP)
   - Usa `findings` array con problemas detectados
   - Severidad: high/medium/low

3. **Accessibility** (axe-core)
   - Usa `actionPlan` con violaciones WCAG
   - Prioriza por impact: critical/serious/moderate

4. **Reliability** (Uptime)
   - Usa `actionPlan` con problemas de disponibilidad
   - Métricas: availability%, avgResponseTime

5. **Maintainability** (Wappalyzer)
   - Usa `actionPlan` con stack tecnológico
   - Detecta: jQuery, WordPress, frameworks

6. **Portability** (MDN BCD)
   - Métricas: compatibleBrowsers, incompatibilities
   - Recomendaciones sobre polyfills

---

## 📞 Soporte

- **Repositorio**: https://github.com/JuanMT777/Proyecto-de-pruebas-de-rendimiento
- **Issues**: https://github.com/JuanMT777/Proyecto-de-pruebas-de-rendimiento/issues
- **Documentación**: Ver carpeta `/docs`

---

**Última actualización**: Octubre 2025  
**Versión**: 2.0 - FlipCards con Recomendaciones Reales
