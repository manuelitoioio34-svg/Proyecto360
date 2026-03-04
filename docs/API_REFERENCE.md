# 📡 API Reference - Vision web 360

## 📋 Tabla de Contenidos
- [Autenticación](#autenticación)
- [Endpoints de Diagnósticos](#endpoints-de-diagnósticos)
- [Endpoints de Auditorías](#endpoints-de-auditorías)
- [Endpoints de Administración](#endpoints-de-administración)
- [Tipos TypeScript](#tipos-typescript)
- [Códigos de Error](#códigos-de-error)

---

## 🔐 Autenticación

Todos los endpoints (excepto `/api/auth/login` y `/api/auth/register`) requieren autenticación JWT.

### Obtener Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "auditor",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Usar Token

**Header en todos los requests subsecuentes:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ejemplo con Axios:**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🔍 Endpoints de Diagnósticos

### Dashboard General (SSE)

**Endpoint:** `POST /api/diagnostics/dashboard-stream`

**Descripción:** Ejecuta las 6 APIs en paralelo y retorna resultados vía Server-Sent Events.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response (Server-Sent Events):**

```
event: start
data: {"total":6}

event: progress
data: {"current":1,"total":6,"apiName":"performance"}

event: result
data: {"apiName":"performance","score":85,"recommendations":[...]}

event: result
data: {"apiName":"security","score":88,"recommendations":[...]}

event: result
data: {"apiName":"accessibility","score":92,"recommendations":[...]}

event: result
data: {"apiName":"reliability","score":100,"recommendations":[...]}

event: result
data: {"apiName":"maintainability","score":78,"recommendations":[...]}

event: result
data: {"apiName":"portability","score":95,"recommendations":[...]}

event: complete
data: {"overallScore":89.67,"timestamp":"2025-01-15T10:35:00.000Z"}
```

**Ejemplo de uso (Frontend):**
```typescript
const eventSource = new EventSource(
  'http://localhost:3000/api/diagnostics/dashboard-stream',
  { withCredentials: true }
);

eventSource.addEventListener('start', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Iniciando ${data.total} análisis`);
});

eventSource.addEventListener('result', (e) => {
  const diagnostic = JSON.parse(e.data);
  console.log(`${diagnostic.apiName}: ${diagnostic.score}`);
});

eventSource.addEventListener('complete', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Score general: ${data.overallScore}`);
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  console.error('Error en SSE:', e);
  eventSource.close();
});
```

---

### Performance

**Endpoint:** `GET /api/diagnostics/performance`

**Query Parameters:**
- `url` (string, required): URL a analizar

**Response (200 OK):**
```json
{
  "score": 85,
  "metrics": {
    "lcp": 2.3,
    "fid": 90,
    "cls": 0.08,
    "fcp": 1.5,
    "speedIndex": 3.2,
    "tti": 4.1
  },
  "opportunities": [
    {
      "title": "Eliminar recursos que bloquean el renderizado",
      "description": "Los recursos bloquean el primer renderizado de tu página...",
      "savings": "450ms"
    }
  ],
  "diagnostics": [
    {
      "title": "Reduce el tamaño de CSS no utilizado",
      "description": "Reduce CSS no utilizado y diferir CSS no crítico...",
      "savings": "12KB"
    }
  ]
}
```

---

### Security

**Endpoint:** `GET /api/diagnostics/security`

**Query Parameters:**
- `url` (string, required): URL a analizar

**Response (200 OK):**
```json
{
  "score": 88,
  "findings": [
    {
      "severity": "high",
      "title": "Content-Security-Policy header no está configurado",
      "description": "CSP ayuda a prevenir ataques XSS...",
      "recommendation": "Agregar header Content-Security-Policy: default-src 'self';"
    },
    {
      "severity": "medium",
      "title": "X-Frame-Options no está configurado",
      "description": "Protege contra ataques de clickjacking...",
      "recommendation": "Agregar header X-Frame-Options: DENY"
    }
  ],
  "headers": {
    "strict-transport-security": "max-age=31536000",
    "x-content-type-options": "nosniff",
    "x-xss-protection": "1; mode=block"
  }
}
```

---

### Accessibility

**Endpoint:** `GET /api/diagnostics/accessibility`

**Query Parameters:**
- `url` (string, required): URL a analizar

**Response (200 OK):**
```json
{
  "score": 92,
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "Elementos deben tener suficiente contraste de color",
      "nodes": [
        {
          "html": "<button class='btn-primary'>Submit</button>",
          "target": ["#submit-btn"],
          "failureSummary": "Contraste insuficiente (3.1:1, mínimo 4.5:1)"
        }
      ]
    }
  ],
  "passes": 45,
  "incomplete": 2,
  "inapplicable": 12
}
```

---

### Reliability

**Endpoint:** `GET /api/diagnostics/reliability`

**Query Parameters:**
- `url` (string, required): URL a analizar

**Response (200 OK):**
```json
{
  "score": 100,
  "availability": 100,
  "latency": 245,
  "attempts": [
    { "success": true, "time": 243 },
    { "success": true, "time": 248 },
    { "success": true, "time": 244 }
  ],
  "redirects": 0,
  "hasCache": true
}
```

---

### Maintainability

**Endpoint:** `GET /api/diagnostics/maintainability`

**Query Parameters:**
- `url` (string, required): URL a analizar

**Response (200 OK):**
```json
{
  "score": 78,
  "technologies": [
    {
      "name": "React",
      "version": "18.2.0",
      "categories": ["JavaScript frameworks"],
      "confidence": 100
    },
    {
      "name": "Next.js",
      "version": "13.4.0",
      "categories": ["Web frameworks"],
      "confidence": 100
    }
  ],
  "recommendations": [
    {
      "id": "wap:react-version",
      "title": "Actualizar React a última versión",
      "severity": "medium",
      "description": "Versión 18.2.0 detectada, última versión disponible: 19.1.0"
    }
  ]
}
```

---

### Portability

**Endpoint:** `GET /api/diagnostics/portability`

**Query Parameters:**
- `url` (string, required): URL a analizar

**Response (200 OK):**
```json
{
  "score": 95,
  "compatibleBrowsers": ["chrome", "firefox", "safari", "edge"],
  "incompatibilities": [
    {
      "api": "backdrop-filter",
      "browsers": ["safari < 14"],
      "severity": "low",
      "recommendation": "Agregar prefijos CSS: -webkit-backdrop-filter"
    }
  ],
  "totalAPIsChecked": 24
}
```

---

## 📚 Endpoints de Auditorías

### Listar Auditorías

**Endpoint:** `GET /api/audits/history`

**Query Parameters:**
- `url` (string, optional): Filtrar por URL
- `limit` (number, optional): Máximo de resultados (default: 50)
- `skip` (number, optional): Paginación (default: 0)

**Response (200 OK):**
```json
{
  "audits": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "url": "https://example.com",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "scores": {
        "performance": 85,
        "security": 88,
        "accessibility": 92,
        "reliability": 100,
        "maintainability": 78,
        "portability": 95,
        "overall": 89.67
      },
      "userId": "507f1f77bcf86cd799439012"
    }
  ],
  "total": 125,
  "page": 1,
  "pages": 3
}
```

---

### Obtener Auditoría por ID

**Endpoint:** `GET /api/audits/:id`

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "url": "https://example.com",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "scores": { ... },
  "details": {
    "performance": { ... },
    "security": { ... },
    "accessibility": { ... },
    "reliability": { ... },
    "maintainability": { ... },
    "portability": { ... }
  },
  "userId": "507f1f77bcf86cd799439012",
  "userEmail": "user@example.com"
}
```

---

### Eliminar Auditoría

**Endpoint:** `DELETE /api/audits/:id`

**Permisos requeridos:** `delete:audit` (Admin o propietario)

**Response (200 OK):**
```json
{
  "message": "Auditoría eliminada correctamente",
  "id": "507f1f77bcf86cd799439011"
}
```

---

### Exportar Auditoría (PDF)

**Endpoint:** `GET /api/audits/:id/export`

**Response (200 OK):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="audit-507f1f77bcf86cd799439011.pdf"

<binary PDF data>
```

---

## 👥 Endpoints de Administración

### Listar Usuarios

**Endpoint:** `GET /api/admin/users`

**Permisos requeridos:** `read:users` (Admin)

**Response (200 OK):**
```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastLogin": "2025-01-15T09:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "email": "auditor@example.com",
      "role": "auditor",
      "createdAt": "2025-01-05T00:00:00.000Z",
      "lastLogin": "2025-01-15T10:00:00.000Z"
    }
  ],
  "total": 24
}
```

---

### Actualizar Rol de Usuario

**Endpoint:** `PUT /api/admin/users/:id/role`

**Permisos requeridos:** `update:user` (Admin)

**Request:**
```json
{
  "role": "auditor"
}
```

**Response (200 OK):**
```json
{
  "message": "Rol actualizado correctamente",
  "user": {
    "_id": "507f1f77bcf86cd799439013",
    "email": "user@example.com",
    "role": "auditor"
  }
}
```

---

### Eliminar Usuario

**Endpoint:** `DELETE /api/admin/users/:id`

**Permisos requeridos:** `delete:user` (Admin)

**Response (200 OK):**
```json
{
  "message": "Usuario eliminado correctamente",
  "id": "507f1f77bcf86cd799439013"
}
```

---

### Logs de Auditoría Administrativa

**Endpoint:** `GET /api/admin/logs`

**Permisos requeridos:** `read:logs` (Admin)

**Query Parameters:**
- `action` (string, optional): Filtrar por tipo de acción
- `userId` (string, optional): Filtrar por usuario
- `limit` (number, optional): Máximo de resultados

**Response (200 OK):**
```json
{
  "logs": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "action": "update:user:role",
      "userId": "507f1f77bcf86cd799439012",
      "targetUserId": "507f1f77bcf86cd799439013",
      "details": {
        "oldRole": "viewer",
        "newRole": "auditor"
      },
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 342
}
```

---

## 📦 Tipos TypeScript

### Diagnostic

```typescript
interface Diagnostic {
  apiName: 'performance' | 'security' | 'accessibility' | 'reliability' | 'maintainability' | 'portability';
  score: number; // 0-100
  recommendations: Recommendation[];
  timestamp: Date;
}
```

### Recommendation

```typescript
interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  impact?: string;
}
```

### Audit

```typescript
interface Audit {
  _id: string;
  url: string;
  timestamp: Date;
  scores: {
    performance: number;
    security: number;
    accessibility: number;
    reliability: number;
    maintainability: number;
    portability: number;
    overall: number;
  };
  details: {
    performance: PerformanceResult;
    security: SecurityResult;
    accessibility: AccessibilityResult;
    reliability: ReliabilityResult;
    maintainability: MaintainabilityResult;
    portability: PortabilityResult;
  };
  userId: string;
  userEmail: string;
}
```

### User

```typescript
interface User {
  _id: string;
  email: string;
  password: string; // Hasheado con bcrypt
  role: 'admin' | 'auditor' | 'viewer';
  createdAt: Date;
  lastLogin?: Date;
}
```

### RolePermissions

```typescript
interface RolePermissions {
  _id: string;
  role: 'admin' | 'auditor' | 'viewer';
  permissions: string[]; // Ej: ['read:audits', 'create:audit', 'delete:audit']
}
```

---

## ⚠️ Códigos de Error

### 400 Bad Request

**Causas:**
- URL inválida o faltante
- Formato de datos incorrecto
- Parámetros requeridos faltantes

**Ejemplo:**
```json
{
  "error": "URL inválida: debe comenzar con http:// o https://"
}
```

---

### 401 Unauthorized

**Causas:**
- Token JWT faltante
- Token expirado
- Token inválido

**Ejemplo:**
```json
{
  "error": "Token JWT no proporcionado"
}
```

---

### 403 Forbidden

**Causas:**
- Usuario sin permisos para la acción
- Rol insuficiente

**Ejemplo:**
```json
{
  "error": "Sin permisos para ejecutar esta acción",
  "required": "delete:user",
  "current": "read:audits"
}
```

---

### 404 Not Found

**Causas:**
- Recurso no existe (usuario, auditoría)
- Endpoint incorrecto

**Ejemplo:**
```json
{
  "error": "Auditoría no encontrada",
  "id": "507f1f77bcf86cd799439011"
}
```

---

### 500 Internal Server Error

**Causas:**
- Error en API externa (Lighthouse, Observatory)
- Error de base de datos
- Error no manejado

**Ejemplo:**
```json
{
  "error": "Error interno del servidor",
  "message": "MongoDB connection failed"
}
```

---

### 503 Service Unavailable

**Causas:**
- Microservicio no responde (microPagespeed, security-service)
- Timeout excedido

**Ejemplo:**
```json
{
  "error": "Servicio no disponible",
  "service": "microPagespeed",
  "message": "Timeout de 300s excedido"
}
```

---

## 📊 Rate Limiting (Recomendado)

**No implementado actualmente, pero recomendado para producción:**

```typescript
// Ejemplo de configuración
Rate Limit: 100 requests / 15 minutos por IP
Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 87
  X-RateLimit-Reset: 1642252800
```

---

## 🔗 Webhooks (Futuro)

**Planeado para versiones futuras:**

```typescript
POST /api/webhooks/audit-completed
{
  "auditId": "507f1f77bcf86cd799439011",
  "url": "https://example.com",
  "overallScore": 89.67,
  "timestamp": "2025-01-15T10:35:00.000Z"
}
```

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0
