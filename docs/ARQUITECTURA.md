# Arquitectura del proyecto - Visión web 360°

## Tabla de Contenidos
- [Resumen Ejecutivo](#resumen-ejecutivo)
- [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
- [Diagrama de Componentes](#diagrama-de-componentes)
- [Flujo de Datos](#flujo-de-datos)
- [Patrones de Diseño](#patrones-de-diseño)
- [Seguridad](#seguridad)
- [Escalabilidad](#escalabilidad)

---

## 📖 Resumen Ejecutivo

**Visión web 360°** sigue una **arquitectura de microservicios distribuida** con las siguientes características:

 - Separación de responsabilidades: Frontend, Backend, Microservicios independientes
 - Comunicación asíncrona: Server-Sent Events (SSE) para streaming progresivo
 - Escalabilidad horizontal: Cada servicio puede escalar independientemente
 - Resiliencia: Promise.allSettled garantiza ejecución completa incluso si alguna API falla
 - Caché inteligente: Redis para resultados de APIs externas (opcional)
 - Autenticación centralizada: JWT con middleware reutilizable

---

**Nota de versión:** Soporte experimental de SQL Server fue revertido y eliminado del repositorio. Actualmente la plataforma usa exclusivamente MongoDB (Mongoose) para persistencia. Para historial de cambios y la razón del revert, ver commits en el repositorio o el archivo de historial correspondiente.

---

## Decisiones Arquitectónicas

### 1. ¿Por qué Microservicios?

| Decisión | Razón |
|----------|-------|
| **microPagespeed separado** | Lighthouse consume 2-4GB RAM y tarda 30-60s. Aislar evita bloquear backend principal |
| **security-service separado** | El servicio realiza por defecto un análisis local de cabeceras y SRI; la integración con Mozilla Observatory existe como utilitario pero no está habilitada por defecto. |
| **4 APIs internas** | Lógica ligera (<5s), pueden vivir en backend sin afectar rendimiento |

### 2. ¿Por qué Server-Sent Events (SSE)?

**Alternativas consideradas:**
- ❌ **WebSockets**: Overkill para flujo unidireccional servidor → cliente
- ❌ **Polling**: Ineficiente, múltiples requests HTTP innecesarios
- ✅ **SSE**: Nativo en HTTP/1.1, reconexión automática, menor overhead

**Ventajas:**
- Feedback en tiempo real de cada API
- Progreso visual (1/6, 2/6, ..., 6/6)
- Conexión única, eventos múltiples
- Compatible con CORS y proxies

### 3. ¿Por qué MongoDB?

**Alternativas consideradas:**
- ❌ **PostgreSQL**: No necesitamos relaciones complejas ni ACID estricto
- ❌ **SQLite**: No escala para producción con alta concurrencia
- ✅ **MongoDB**: Esquema flexible, excelente para documentos JSON (auditorías)

**Casos de uso:**
- Usuarios y roles (documentos pequeños)
- Auditorías históricas (documentos grandes con métricas anidadas)
- Logs administrativos (append-only, sin joins)

### 4. ¿Por qué TypeScript en todo el stack?

**Beneficios:**
- Type safety en frontend y backend
- Interfaces compartidas (tipos de respuestas API)
- Refactoring seguro
- Autocomplete en IDE
- Reducción de bugs en tiempo de desarrollo

### 5. ¿Por qué shadcn/ui en vez de Material-UI?

| Criterio | shadcn/ui | Material-UI |
|----------|-----------|-------------|
| **Bundle size** | ~50KB (solo componentes usados) | ~300KB mínimo |
| **Customización** | Total (código fuente en proyecto) | Limitada (tema MUI) |
| **Performance** | No runtime CSS-in-JS | Runtime overhead |
| **Aprendizaje** | TailwindCSS estándar | Sistema de tema propio |

---

## Diagrama de Componentes

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                          │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              React 19 SPA (Vite - Puerto 5173)                 │ │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐ │ │
│  │  │ Pages    │Components│ Services │  Hooks   │   Routing    │ │ │
│  │  │          │          │          │          │ (React Router)│ │ │
│  │  └──────────┴──────────┴──────────┴──────────┴──────────────┘ │ │
│  │                                                                 │ │
│  │  Tecnologías:                                                   │ │
│  │  - Framer Motion 12 (Animaciones FlipCards)                    │ │
│  │  - Recharts 3 (Gráficas métricas)                              │ │
│  │  - shadcn/ui + TailwindCSS (UI Components)                     │ │
│  │  - Axios 1.11 (HTTP Client)                                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP/HTTPS (REST + SSE)
                           │ CORS Enabled
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CAPA DE LÓGICA DE NEGOCIO                       │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │         Backend Express 5 (Node.js 18 - Puerto 3000)           │ │
│  │  ┌──────────────┬─────────────┬────────────────┬────────────┐ │ │
│  │  │ Controllers  │   Routes    │   Middleware   │   Utils    │ │ │
│  │  │              │             │                │            │ │ │
│  │  │ - diagnostic │- /api/      │ - auth.ts      │ - lh.ts    │ │ │
│  │  │ - auth       │  diagnostics│   (JWT verify) │ - telemetry│ │ │
│  │  │ - admin      │- /api/auth  │ - permissions  │ - apiClients│ │ │
│  │  │ - history    │- /api/admin │                │            │ │ │
│  │  └──────────────┴─────────────┴────────────────┴────────────┘ │ │
│  │                                                                 │ │
│  │  Tecnologías:                                                   │ │
│  │  - Express 5.1                                                  │ │
│  │  - Mongoose 8 (ODM MongoDB)                                     │ │
│  │  - jsonwebtoken (JWT Auth)                                      │ │
│  │  - Pino 9 (Logging estructurado)                                │ │
│  │  - node-cache 5 (Caché en memoria)                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└────┬────────────────────────────┬───────────────────────────────┬───┘
     │ HTTP                       │ HTTP                          │
     │ (Timeout: 300s)            │ (Timeout: 120s)               │ MongoDB
     ▼                            ▼                               │ Driver
┌──────────────────────┐  ┌──────────────────────┐               │
│  MICROSERVICIO 1     │  │  MICROSERVICIO 2     │               │
│                      │  │                      │               │
│  microPagespeed      │  │  security-service    │               │
│  Puerto 3001         │  │  Puerto 3002         │               │
│                      │  │                      │               │
│  ┌────────────────┐  │  │  ┌────────────────┐  │               │

### Microservicios

```
microPagespeed (Puerto 3001)
├── Google Lighthouse 11.x
├── Timeout: 300s
└── Formatos: Desktop + Mobile
```

### APIs Internas (server/utils/apiClients/)

```
axeClient.ts → axe-core 4.8 + jsdom 23
uptimeClient.ts → axios (3 reintentos)
wappalyzerClient.ts → Wappalyzer API + Heurística
portabilityClient.ts → @mdn/browser-compat-data 5.x
```
│  │ Google         │  │  │  │ Mozilla        │  │               │
│  │ Lighthouse 11  │  │  │  │ Observatory    │  │               │
│  │                │  │  │  │ API            │  │               │
│  │ + PageSpeed    │  │  │  │ +              │  │               │
│  │   Insights     │  │  │  │ Headers        │  │               │
│  │                │  │  │  │ Analysis       │  │               │
│  └────────────────┘  │  │  └────────────────┘  │               │
│                      │  │                      │               │
│  Métricas:           │  │  Métricas:           │               │
│  - LCP, FID, CLS     │  │  - Security Score    │               │
│  - SEO Score         │  │  - Findings          │               │
│  - Accessibility     │  │  - Headers Check     │               │
│  - Best Practices    │  │                      │               │
└──────────────────────┘  └──────────────────────┘               │
                                                                  │
                           ▼                                      │
┌─────────────────────────────────────────────────────────────────┴───┐
│                        CAPA DE DATOS                                 │
│                                                                       │
│  ┌────────────────────────────┐  ┌──────────────────────────────┐  │
│  │   MongoDB (Puerto 27017)   │  │   Redis (Puerto 6379)        │  │
│  │                            │  │   [OPCIONAL]                 │  │
│  │  Colecciones:              │  │                              │  │
│  │  ├── users                 │  │  Caché de:                   │  │
│  │  ├── audits                │  │  ├── Resultados Lighthouse   │  │
│  │  ├── rolePermissions       │  │  ├── Resultados Observatory (si habilitado)  │  │
│  │  ├── adminLogs             │  │  └── Wappalyzer API          │  │
│  │  ├── telemetryEvents       │  │                              │  │
│  │  └── securityAudits        │  │  TTL: 1 hora (configurable)  │  │
│  └────────────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   APIS INTERNAS (Backend Utils)                      │
│                                                                       │
│  ┌─────────────┬─────────────┬──────────────┬────────────────────┐  │
│  │ axeClient   │uptimeClient │wappalyzerCli │ portabilityClient  │  │
│  │             │             │              │                    │  │
│  │ axe-core    │ axios       │ Wappalyzer   │ @mdn/browser-      │  │
│  │ 4.8.x       │ (3 retries) │ API          │  compat-data       │  │
│  │ + jsdom     │             │ + Heuristics │ + jsdom            │  │
│  │             │             │              │                    │  │
│  │ Timeout: 60s│ Timeout: 30s│ Timeout: 45s │ Timeout: 60s       │  │
│  └─────────────┴─────────────┴──────────────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Componentes Frontend Clave

```
src/
├── pages/
│   ├── dashboard/
│   │   └── DashBoardGeneral.tsx
│   │       ├── useEffect → Llamada SSE a /api/diagnostics/dashboard-stream
│   │       ├── Estado: diagnostics[] (6 APIs)
│   │       ├── Renderiza: Grid 3x2 de FlipCards
│   │       └── Navegación: onClick → /diagnostics/{apiName}
│   │
│   └── diagnostics/
│       ├── PerformanceView.tsx → Vista detallada Performance
│       ├── SecurityView.tsx → Vista detallada Security
│       ├── AccessibilityView.tsx → Vista detallada Accessibility
│       ├── ReliabilityView.tsx → Vista detallada Reliability
│       ├── MaintainabilityView.tsx → Vista detallada Maintainability
│       └── PortabilityView.tsx → Vista detallada Portability
│
├── components/
│   ├── dashboard/
│   │   ├── FlipCard.tsx
│   │   │   ├── Props: icon, name, score, recommendations[], color
│   │   │   ├── Estado: isFlipped (useState)
│   │   │   ├── Frente: CircularGauge + Badge + Hint
│   │   │   └── Reverso: Lista recomendaciones (max 5)
│   │   │
│   │   ├── CircularGauge.tsx
│   │   │   ├── SVG Circle animado
│   │   │   └── Colores dinámicos según score
│   │   │
│   │   └── ScoreBar.tsx
│   │       └── Barra de progreso horizontal
│   │
│   └── layout/
│       ├── Header.tsx → Logo + Nav + User Menu
│       ├── Sidebar.tsx → Menú lateral con permisos
│       └── Footer.tsx
│
└── services/
    ├── diagnostics.api.ts
    │   ├── runDashboardStream() → SSE connection
    │   └── EventSource listeners
    │
    └── audit.service.ts
        ├── getAuditHistory()
        ├── deleteAudit()
        └── exportAuditPDF()
```

### Componentes Backend Clave

```
server/
├── controllers/
│   ├── diagnostic.controller.ts
│   │   ├── dashboardStream() → SSE endpoint
│   │   │   ├── res.setHeader('Content-Type', 'text/event-stream')
│   │   │   ├── Ejecuta 6 APIs en paralelo (Promise.allSettled)
│   │   │   ├── Por cada API completada → res.write('event: result\n...')
│   │   │   └── Al finalizar → res.write('event: complete\n...')
│   │   │
│   │   └── generateRecommendations(apiName, rawResult)
│   │       ├── Prioridad 1: actionPlan (si existe)
│   │       ├── Prioridad 2: findings (security)
│   │       └── Prioridad 3: Métricas + lógica custom
│   │
│   ├── auth.controller.ts
│   │   ├── register() → Hash password + JWT
│   │   ├── login() → Verify password + JWT
│   │   └── me() → Get current user
│   │
│   └── admin.controller.ts
│       ├── getUsers() → Listar usuarios
│       ├── updateUserRole() → Cambiar rol
│       └── deleteUser() → Soft delete
│
├── middleware/
│   └── auth.ts
│       ├── verifyToken() → JWT validation
│       └── checkPermissions() → Role-based access
│
└── utils/
    └── apiClients/
        ├── axeClient.ts
        │   ├── Crea DOM virtual con jsdom
        │   ├── Ejecuta axe.run()
        │   ├── Extrae violations
        │   └── Retorna: { score, violations[], actionPlan[] }
        │
        ├── uptimeClient.ts
        │   ├── 3 intentos de HTTP GET
        │   ├── Mide latencia promedio
        │   ├── Detecta redirects
        │   └── Retorna: { score, availability, latency, actionPlan[] }
        │
        ├── wappalyzerClient.ts
        │   ├── Opción 1: Wappalyzer API (si hay token)
        │   ├── Opción 2: Heurística (regex en HTML)
        │   ├── Detecta: React, Angular, Vue, jQuery, WordPress
        │   └── Retorna: { score, technologies[], actionPlan[] }
        │
        └── portabilityClient.ts
            ├── Parsea HTML con jsdom
            ├── Busca APIs web usadas
            ├── Consulta MDN BCD
            ├── Verifica compatibilidad: Chrome, Firefox, Safari, Edge
            └── Retorna: { score, compatible[], incompatibilities[], actionPlan[] }
```

---

## 🔄 Flujo de Datos

### Flujo 1: Dashboard General (SSE)

```
1. Usuario navega a /dashboard?url=https://example.com
   ↓
2. Frontend (DashBoardGeneral.tsx):
   useEffect(() => {
     runDashboardStream(url)
       .onStart(() => setLoading(true))
       .onProgress((data) => updateProgress(data))
       .onResult((diagnostic) => addDiagnostic(diagnostic))
       .onComplete((overall) => setOverallScore(overall))
       .onError((err) => setError(err));
   }, [url]);
   ↓
3. Frontend → POST /api/diagnostics/dashboard-stream { url }
   ↓
4. Backend (diagnostic.controller.ts):
   export const dashboardStream = async (req, res) => {
     // Configurar SSE
     res.setHeader('Content-Type', 'text/event-stream');
     res.setHeader('Cache-Control', 'no-cache');
     res.setHeader('Connection', 'keep-alive');
     
     // Evento inicial
     res.write('event: start\ndata: {"total": 6}\n\n');
     
     // Ejecutar 6 APIs en paralelo
     const promises = [
       runPerformance(url),    // microPagespeed
       runSecurity(url),       // security-service
       runAccessibility(url),  // axeClient
       runReliability(url),    // uptimeClient
       runMaintainability(url), // wappalyzerClient
       runPortability(url)     // portabilityClient
     ];
     
     const results = await Promise.allSettled(promises);
     
     // Procesar cada resultado
     for (const result of results) {
       if (result.status === 'fulfilled') {
         const recommendations = generateRecommendations(
           result.apiName, 
           result.value
         );
         
         res.write(`event: result\ndata: ${JSON.stringify({
           apiName: result.apiName,
           score: result.value.score,
           recommendations
         })}\n\n`);
       } else {
         res.write(`event: error\ndata: ${JSON.stringify({
           apiName: result.apiName,
           error: result.reason
         })}\n\n`);
       }
     }
     
     // Calcular score general
     const overallScore = calculateOverallScore(results);
     
     // Evento final
     res.write(`event: complete\ndata: ${JSON.stringify({
       overallScore,
       timestamp: new Date()
     })}\n\n`);
     
     res.end();
   };
   ↓
5. Frontend recibe eventos SSE:
   - event: start → Muestra loading (0/6)
   - event: result → Actualiza FlipCard correspondiente (1/6, 2/6, ...)
   - event: result → Actualiza siguiente FlipCard (2/6, 3/6, ...)
   - ... (x6 veces)
   - event: complete → Muestra score general, oculta loading
   ↓
6. Usuario ve:
   - Grid 3x2 con 6 FlipCards
   - Cada card con gráfica circular + score
   - Click en card → Flip 3D → Recomendaciones
   - Click en botón "Ver Detalles" → Navega a vista individual
```

### Flujo 2: Vista Individual (Performance)

```
1. Usuario click en "Ver Detalles" de Performance
   ↓
2. Frontend → Navigate to /diagnostics/performance?url=https://example.com
   ↓
3. PerformanceView.tsx:
   useEffect(() => {
     fetch(`/api/diagnostics/performance?url=${url}`)
       .then(res => res.json())
       .then(data => setMetrics(data));
   }, [url]);
   ↓
4. Backend → GET /api/diagnostics/performance?url=...
   ↓
5. Controller llama a microPagespeed:
   const response = await axios.post('http://localhost:3001/api/audit', {
     url,
     device: 'desktop',
     timeout: 300000
   });
   ↓
6. microPagespeed ejecuta Lighthouse:
   const browser = await puppeteer.launch({ headless: true });
   const result = await lighthouse(url, {
     port: new URL(browser.wsEndpoint()).port,
     onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices']
   });
   ↓
7. microPagespeed retorna:
   {
     score: 85,
     metrics: {
       lcp: 2.3,
       fid: 90,
       cls: 0.08,
       fcp: 1.5,
       speedIndex: 3.2,
       tti: 4.1
     },
     opportunities: [...],
     diagnostics: [...]
   }
   ↓
8. Backend procesa y retorna a frontend
   ↓
9. Frontend renderiza:
   - Score general circular
   - Tabla de métricas (LCP, FID, CLS, etc.)
   - Gráfico de evolución temporal
   - Lista de oportunidades de mejora
   - Botón "Exportar PDF"
```

### Flujo 3: Autenticación JWT

```
1. Usuario ingresa email + password en Login
   ↓
2. Frontend → POST /api/auth/login { email, password }
   ↓
3. Backend (auth.controller.ts):
   const user = await User.findOne({ email });
   if (!user) throw new Error('Usuario no existe');
   
   const isValid = await bcrypt.compare(password, user.password);
   if (!isValid) throw new Error('Contraseña incorrecta');
   
   const token = jwt.sign(
     { id: user._id, role: user.role },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );
   
   return { token, user };
   ↓
4. Frontend guarda token en localStorage:
   localStorage.setItem('token', response.token);
   ↓
5. Para cada request subsecuente:
   axios.interceptors.request.use(config => {
     const token = localStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   ↓
6. Backend verifica token en middleware:
   export const verifyToken = (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'No autorizado' });
     
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.user = decoded;
       next();
     } catch (err) {
       return res.status(401).json({ error: 'Token inválido' });
     }
   };
   ↓
7. Verificación de permisos:
   export const checkPermissions = (requiredPermission) => {
     return (req, res, next) => {
       const userRole = req.user.role;
       const rolePermissions = await RolePermissions.findOne({ role: userRole });
       
       if (!rolePermissions.permissions.includes(requiredPermission)) {
         return res.status(403).json({ error: 'Sin permisos' });
       }
       
       next();
     };
   };
```

---

## Patrones de Diseño

### 1. Controller Pattern

**Backend**: Controladores separan lógica de rutas

```typescript
// ❌ Antes: Todo en route
router.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  // ... 50 líneas de lógica
});

// Después: Controller separado
router.post('/login', authController.login);

// auth.controller.ts
export const login = async (req, res) => {
  // Lógica reutilizable, testeable
};
```

### 2. Service Layer Pattern

**Frontend**: Servicios separan llamadas API de componentes

```typescript
// ❌ Antes: fetch directo en componente
const DashBoard = () => {
  useEffect(() => {
    fetch('/api/diagnostics/dashboard')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);
};

// Después: Servicio reutilizable
import { runDashboardStream } from '@/services/diagnostics.api';

const DashBoard = () => {
  useEffect(() => {
    runDashboardStream(url)
      .onResult(updateDiagnostic)
      .onComplete(setOverallScore);
  }, [url]);
};
```

### 3. Middleware Chain Pattern

**Backend**: Middlewares reutilizables para auth y permisos

```typescript
router.delete(
  '/users/:id',
  verifyToken,                    // Middleware 1: Verifica JWT
  checkPermissions('delete:user'), // Middleware 2: Verifica permiso
  adminController.deleteUser       // Controller final
);
```

### 4. Factory Pattern

**Backend**: Generación dinámica de recomendaciones

```typescript
export const generateRecommendations = (apiName: string, rawResult: any) => {
  switch (apiName) {
    case 'performance':
      return generatePerformanceRecommendations(rawResult);
    case 'security':
      return generateSecurityRecommendations(rawResult);
    case 'accessibility':
      return generateAccessibilityRecommendations(rawResult);
    // ...
  }
};
```

### 5. Component Composition Pattern

**Frontend**: Componentes reutilizables con props

```tsx
// FlipCard es reutilizable para cualquier métrica
<FlipCard
  icon={Shield}
  name="Security"
  score={88}
  recommendations={securityRecommendations}
  color="blue"
  onNavigate={() => navigate('/diagnostics/security')}
/>

<FlipCard
  icon={Zap}
  name="Performance"
  score={92}
  recommendations={performanceRecommendations}
  color="orange"
  onNavigate={() => navigate('/diagnostics/performance')}
/>
```

### 6. Promise.allSettled Pattern

**Backend**: Ejecución paralela con manejo de errores individual

```typescript
// Promise.allSettled: Continúa aunque alguna falle
const results = await Promise.allSettled([
  runPerformance(url),
  runSecurity(url),
  runAccessibility(url),
  runReliability(url),
  runMaintainability(url),
  runPortability(url)
]);

results.forEach(result => {
  if (result.status === 'fulfilled') {
    // Procesar resultado exitoso
  } else {
    // Registrar error, continuar con otras APIs
  }
});

// ❌ Promise.all: Si una falla, todas fallan
```

---

## Seguridad

### Autenticación y Autorización

| Capa | Implementación |
|------|----------------|
| **Autenticación** | JWT (JSON Web Tokens) con expiración 7 días |
| **Hash de contraseñas** | bcrypt con salt rounds = 10 |
| **Tokens** | Almacenados en localStorage (frontend) |
| **Verificación** | Middleware `verifyToken` en cada endpoint protegido |
| **Roles** | Admin, Auditor, Viewer (extensible) |
| **Permisos** | Granulares por endpoint (CRUD) |

### CORS

```typescript
// server/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Validación de Entrada

```typescript
// Ejemplo: Validación URL
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};
```

### Rate Limiting (Recomendado para producción)

```typescript
// TODO: Implementar express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: 'Demasiadas solicitudes, intente nuevamente en 15 minutos'
});

app.use('/api/', limiter);
```

---

## 📈 Escalabilidad

### Estrategias de Escalabilidad Horizontal

| Componente | Estrategia |
|------------|-----------|
| **Frontend** | Servir desde CDN (Cloudflare, AWS CloudFront) |
| **Backend** | Múltiples instancias detrás de load balancer (Nginx, AWS ALB) |
| **microPagespeed** | Escalar independientemente (mayor consumo RAM) |
| **security-service** | Escalar independientemente |
| **MongoDB** | Replica Set (3 nodos mínimo) + Sharding si >1TB |
| **Redis** | Redis Cluster (6 nodos mínimo) |

### Caché en Capas

```
Nivel 1: Navegador (Service Worker) → 5 minutos
   ↓
Nivel 2: CDN (Cloudflare) → 1 hora (assets estáticos)
   ↓
Nivel 3: Redis (Backend) → 1 hora (resultados APIs externas)
   ↓
Nivel 4: node-cache (Memoria) → 5 minutos (permisos de roles)
   ↓
Nivel 5: MongoDB → Persistencia
```

### Estimación de Carga

**Supuestos:**
- 1000 usuarios concurrentes
- 10 análisis/usuario/día
- 6 APIs por análisis = 60,000 llamadas API/día

**Recursos necesarios:**

| Servicio | CPU | RAM | Almacenamiento |
|----------|-----|-----|----------------|
| Frontend (Nginx) | 1 core | 512MB | 100MB |
| Backend (Express) | 2 cores | 2GB | - |
| microPagespeed | 4 cores | 8GB | - |
| security-service | 1 core | 1GB | - |
| MongoDB | 2 cores | 4GB | 50GB |
| Redis | 1 core | 1GB | - |
| **TOTAL** | **11 cores** | **16.5GB** | **50GB** |

### Monitoreo Recomendado

```typescript
// TODO: Implementar Prometheus + Grafana
import prometheus from 'prom-client';

// Métricas personalizadas
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de requests HTTP',
  labelNames: ['method', 'route', 'status_code']
});

const apiCallsTotal = new prometheus.Counter({
  name: 'api_calls_total',
  help: 'Total de llamadas a APIs externas',
  labelNames: ['api_name', 'status']
});
```

---

## 🔗 Referencias

- **Google Lighthouse**: https://github.com/GoogleChrome/lighthouse
- **axe-core**: https://github.com/dequelabs/axe-core
- **Mozilla Observatory**: https://observatory.mozilla.org/
- **MDN Browser Compat Data**: https://github.com/mdn/browser-compat-data
- **Server-Sent Events Spec**: https://html.spec.whatwg.org/multipage/server-sent-events.html

---

**Última actualización**: Diciembre 2025  
**Versión**: 1.0.0
