# Guía de Desarrollo - Pulse

## Tabla de Contenidos
- [Setup del Entorno](#setup-del-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Convenciones de Código](#convenciones-de-código)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Testing](#testing)
- [Debugging](#debugging)
- [Contribución](#contribución)

---

## 🛠️ Setup del Entorno

### Requisitos Previos

```powershell
# Verificar Node.js (>= 18.0.0)
node --version

# Verificar npm (>= 9.0.0)
npm --version

# Verificar Git
git --version

# Verificar MongoDB
mongod --version
```

### Instalación Completa

#### 1️⃣ Clonar repositorio
```powershell
git clone <URL_REPOSITORIO>
cd PulseChoukairPerformanceRT(2)
```

#### 2️⃣ Instalar dependencias

**Automatizado (Recomendado):**
```powershell
# Windows
.\install-apis.ps1

# Linux/Mac
chmod +x install-apis.sh
./install-apis.sh
```

**Manual:**
```powershell
# Raíz (Frontend + Redis Worker)
npm install

# Backend
cd server
npm install
cd ..

# microPagespeed
cd microPagespeed
npm install
cd ..

# security-service
cd security-service
npm install
cd ..
```

#### 3️⃣ Configurar variables de entorno

**Raíz (`.env`):**
```env
# Frontend
VITE_API_URL=http://localhost:3000
VITE_MICROPAGESPEED_URL=http://localhost:3001
VITE_SECURITY_URL=http://localhost:3002
```

**Backend (`server/.env`):**
```env
# Servidor
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/pulse

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura_minimo_32_caracteres

# Redis (Opcional)
REDIS_URL=redis://localhost:6379

# APIs Externas (Opcionales)
WAPPALYZER_API_KEY=tu_api_key_de_wappalyzer
```

**microPagespeed (`microPagespeed/.env`):**
```env
PORT=3001
TIMEOUT=300000  # 5 minutos
```

**security-service (`security-service/.env`):**
```env
PORT=3002
TIMEOUT=120000  # 2 minutos
```

#### 4️⃣ Iniciar MongoDB

**Windows:**
```powershell
net start MongoDB
```

**Linux/Mac:**
```bash
sudo systemctl start mongod
```

**Docker (Alternativa):**
```powershell
docker run -d -p 27017:27017 --name mongo mongo:6.0
```

#### 5️⃣ Iniciar Redis (Opcional)

**Windows (WSL):**
```bash
sudo service redis-server start
```

**Docker:**
```powershell
docker run -d -p 6379:6379 --name redis redis:7.2-alpine
```

#### 6️⃣ Iniciar servicios

**Opción 1: Todo junto (3 terminales automáticas)**
```powershell
npm run start:all
```

**Opción 2: Manual (4 terminales separadas)**

```powershell
# Terminal 1 - Backend
cd server
npm run dev
# → http://localhost:3000

# Terminal 2 - Frontend
npm run dev
# → http://localhost:5173

# Terminal 3 - microPagespeed
cd microPagespeed
npm run dev
# → http://localhost:3001

# Terminal 4 - security-service
cd security-service
npm run dev
# → http://localhost:3002
```

#### 7️⃣ Verificar instalación

Abrir navegador en http://localhost:5173 y verificar:
 - Login carga correctamente
 - Registro funciona
 - Dashboard General carga sin errores
- ✅ Consola del navegador sin errores críticos

---

## 📁 Estructura del Proyecto

### Convenciones de Carpetas

```
PulseChoukairPerformanceRT(2)/
├── src/                    # Frontend React
│   ├── components/         # Componentes reutilizables
│   │   ├── common/         # Botones, modales, tooltips
│   │   ├── dashboard/      # FlipCard, CircularGauge
│   │   ├── layout/         # Header, Sidebar, Footer
│   │   └── auth/           # LoginForm, RegisterForm
│   │
│   ├── pages/              # Vistas (1 por ruta)
│   │   ├── dashboard/      # DashBoardGeneral.tsx
│   │   ├── diagnostics/    # Vistas individuales (Performance, Security, ...)
│   │   ├── history/        # HistoricoView.tsx
│   │   ├── admin/          # AdminPanel.tsx
│   │   └── settings/       # SettingsView.tsx
│   │
│   ├── services/           # Llamadas API
│   │   ├── audit.service.ts
│   │   ├── diagnostics.api.ts
│   │   └── auth.service.ts
│   │
│   ├── hooks/              # Custom hooks
│   │   ├── useAudits.ts
│   │   ├── useRolePermissions.ts
│   │   └── useAuth.ts
│   │
│   ├── styles/             # CSS global
│   │   └── globals.css
│   │
│   └── utils/              # Helpers
│       ├── formatters.ts
│       └── validators.ts
│
├── server/                 # Backend Express
│   ├── controllers/        # Lógica de negocio
│   │   ├── diagnostic.controller.ts
│   │   ├── auth.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── routes/             # Definición de endpoints
│   │   ├── diagnostic.routes.ts
│   │   ├── auth.ts
│   │   └── admin.ts
│   │
│   ├── middleware/         # Middlewares reutilizables
│   │   └── auth.ts         # verifyToken, checkPermissions
│   │
│   ├── database/           # Modelos Mongoose
│   │   ├── user.ts
│   │   ├── esquemaBD.ts    # Auditorías
│   │   └── rolePermissions.ts
│   │
│   └── utils/              # Funciones auxiliares
│       ├── apiClients/     # Clientes APIs internas
│       ├── lh.ts           # Lighthouse helpers
│       └── telemetry.ts    # Event tracking
│
├── microPagespeed/         # Microservicio Performance
│   └── src/
│       ├── index.ts
│       └── pagespeed.service.ts
│
├── security-service/       # Microservicio Security
│   └── src/
│       ├── index.ts
│       ├── routes.ts
│       └── services/
│
└── docs/                   # Documentación
    ├── INSTALACION.md
    ├── ARQUITECTURA.md
    └── GUIA_DESARROLLO.md (este archivo)
```

### Nomenclatura de Archivos

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| **Componentes React** | PascalCase.tsx | `FlipCard.tsx`, `DashBoardGeneral.tsx` |
| **Servicios** | camelCase.service.ts | `audit.service.ts`, `diagnostics.api.ts` |
| **Hooks** | use + PascalCase.ts | `useAudits.ts`, `useAuth.ts` |
| **Controladores** | camelCase.controller.ts | `diagnostic.controller.ts` |
| **Rutas** | kebab-case.ts | `diagnostic.routes.ts` |
| **Modelos** | camelCase.ts | `user.ts`, `esquemaBD.ts` |
| **Utils** | camelCase.ts | `lh.ts`, `telemetry.ts` |

---

## 📝 Convenciones de Código

### TypeScript

#### Strict Mode Habilitado

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

#### Interfaces vs Types

```typescript
// ✅ Usar Interfaces para Props y Objetos extensibles
interface FlipCardProps {
  icon: LucideIcon;
  name: string;
  score: number;
  recommendations: Recommendation[];
  color: string;
  onNavigate: () => void;
}

// ✅ Usar Types para Uniones y Tuplas
type Severity = 'high' | 'medium' | 'low' | 'info';
type DiagnosticStatus = 'pending' | 'running' | 'completed' | 'failed';
```

#### Tipos Explícitos en Funciones Públicas

```typescript
// ✅ Bueno: Tipos explícitos
export const generateRecommendations = (
  apiName: string,
  rawResult: any
): Recommendation[] => {
  // ...
};

// ❌ Evitar: Sin tipos
export const generateRecommendations = (apiName, rawResult) => {
  // ...
};
```

### React

#### Functional Components con Hooks

```tsx
// ✅ Bueno: Functional component
const FlipCard: React.FC<FlipCardProps> = ({ 
  icon: Icon, 
  name, 
  score, 
  recommendations 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  return (
    <div onClick={() => setIsFlipped(!isFlipped)}>
      {/* ... */}
    </div>
  );
};

// ❌ Evitar: Class component
class FlipCard extends React.Component {
  // ...
}
```

#### Props Destructuring

```tsx
// ✅ Bueno: Destructuring en parámetros
const Button: React.FC<ButtonProps> = ({ children, onClick, variant }) => {
  return <button onClick={onClick}>{children}</button>;
};

// ❌ Evitar: Acceso con props.
const Button: React.FC<ButtonProps> = (props) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};
```

#### Lazy Loading de Rutas

```tsx
// src/App.tsx
import { lazy, Suspense } from 'react';

const DashBoardGeneral = lazy(() => import('@/pages/dashboard/DashBoardGeneral'));
const PerformanceView = lazy(() => import('@/pages/diagnostics/PerformanceView'));

const App = () => (
  <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/dashboard" element={<DashBoardGeneral />} />
      <Route path="/diagnostics/performance" element={<PerformanceView />} />
    </Routes>
  </Suspense>
);
```

### TailwindCSS

#### Clases en Orden Lógico

```tsx
// ✅ Bueno: Layout → Sizing → Spacing → Typography → Colors → Effects
<div className="flex flex-col w-full max-w-md p-4 space-y-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  {/* ... */}
</div>

// ❌ Evitar: Clases desordenadas
<div className="text-gray-700 shadow-md bg-white p-4 flex w-full rounded-lg hover:shadow-lg flex-col text-sm">
  {/* ... */}
</div>
```

#### Usar shadcn/ui para Componentes Base

```tsx
// ✅ Bueno: Importar de shadcn/ui
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

<Button variant="outline">Click</Button>

// ❌ Evitar: Crear botones desde cero
<button className="px-4 py-2 border rounded...">Click</button>
```

### Backend (Express)

#### Controllers Separados de Routes

```typescript
// ✅ Bueno: Separación de responsabilidades

// routes/diagnostic.routes.ts
import { dashboardStream } from '../controllers/diagnostic.controller';

router.post('/dashboard-stream', verifyToken, dashboardStream);

// controllers/diagnostic.controller.ts
export const dashboardStream = async (req: Request, res: Response) => {
  // Lógica del controlador
};
```

#### Manejo de Errores Consistente

```typescript
// ✅ Bueno: Try-catch con logger
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // ...
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
```

#### Validación de Entrada

```typescript
// ✅ Bueno: Validar antes de procesar
export const runDiagnostic = async (req: Request, res: Response) => {
  const { url } = req.body;
  
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'URL inválida' });
  }
  
  // Procesar...
};
```

---

## 🔄 Flujo de Trabajo

### Workflow de Desarrollo

```
1. Crear rama de feature
   ↓
   git checkout -b feature/nombre-feature

2. Hacer cambios + commits atómicos
   ↓
   git add .
   git commit -m "feat: descripción del cambio"

3. Verificar TypeScript sin errores
   ↓
   npm run typecheck

4. Verificar ESLint
   ↓
   npm run lint

5. Probar localmente
   ↓
   npm run start:all
   # Verificar en http://localhost:5173

6. Push a repositorio remoto
   ↓
   git push origin feature/nombre-feature

7. Crear Pull Request
   ↓
   Revisar cambios, aprobar, merge
```

### Commits Convencionales

Seguir especificación [Conventional Commits](https://www.conventionalcommits.org/)

```bash
# Nuevas características
git commit -m "feat: agregar FlipCards 3D con Framer Motion"

# Correcciones de bugs
git commit -m "fix: corregir extracción de recomendaciones en axeClient"

# Documentación
git commit -m "docs: actualizar INSTALACION.md con pasos MongoDB"

# Refactoring
git commit -m "refactor: separar generateRecommendations por API"

# Performance
git commit -m "perf: agregar caché Redis para resultados Lighthouse"

# Chores (tareas de mantenimiento)
git commit -m "chore: actualizar dependencias a últimas versiones"

# Tests
git commit -m "test: agregar tests unitarios para uptimeClient"
```

### Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Producción estable |
| `develop` | Integración de features |
| `feature/*` | Nuevas características |
| `bugfix/*` | Correcciones de bugs |
| `hotfix/*` | Fixes urgentes en producción |

---

## 🧪 Testing

### Unit Tests (Pendiente implementar)

**Herramientas recomendadas:**
- **Vitest** (frontend)
- **Jest** (backend)

```typescript
// Ejemplo: tests/uptimeClient.test.ts
import { runUptimeCheck } from '../server/utils/apiClients/uptimeClient';

describe('uptimeClient', () => {
  it('debe retornar score > 0 para URL válida', async () => {
    const result = await runUptimeCheck('https://google.com');
    expect(result.score).toBeGreaterThan(0);
  });
  
  it('debe detectar URL no alcanzable', async () => {
    const result = await runUptimeCheck('https://urlquenoexiste123456.com');
    expect(result.availability).toBe(0);
  });
});
```

**Ejecutar tests:**
```powershell
npm test
```

### E2E Tests (Pendiente implementar)

**Herramientas recomendadas:**
- **Playwright** o **Cypress**

```typescript
// Ejemplo: e2e/dashboard.spec.ts
test('Dashboard General debe mostrar 6 FlipCards', async ({ page }) => {
  await page.goto('http://localhost:5173/dashboard?url=https://google.com');
  
  // Esperar a que cargue
  await page.waitForSelector('.flip-card', { timeout: 60000 });
  
  // Verificar que hay 6 cards
  const cards = await page.locator('.flip-card').count();
  expect(cards).toBe(6);
});
```

**Ejecutar E2E:**
```powershell
npm run test:e2e
```

---

## 🐛 Debugging

### Frontend (React)

#### React DevTools

1. Instalar extensión: [React DevTools](https://react.dev/learn/react-developer-tools)
2. Abrir en navegador → F12 → Pestaña "Components"
3. Inspeccionar props y state de componentes

#### Vite DevServer Logs

```powershell
npm run dev
# Logs en terminal → Errores de compilación TypeScript
```

#### Browser Console

```tsx
// Debugging temporal con console.log
const FlipCard = ({ score }) => {
  console.log('FlipCard score:', score);  // 🐛 DEBUGGING
  
  return <div>{score}</div>;
};
```

### Backend (Express)

#### Logs Estructurados con Pino

```typescript
import logger from './utils/logger';

export const dashboardStream = async (req, res) => {
  logger.info('Dashboard stream iniciado', { url: req.body.url });
  
  try {
    // ...
  } catch (error) {
    logger.error('Error en dashboard stream', { error });
  }
};
```

#### Nodemon con Breakpoints

```powershell
cd server
npm run dev
```

**VS Code Debugger:**
1. Crear `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Backend",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

2. Ejecutar backend con debug:
```powershell
cd server
node --inspect index.ts
```

3. F5 en VS Code → Attach to Backend

#### Postman para Endpoints

**Colección recomendada:**
```
Pulse API Collection
├── Auth
│   ├── POST /api/auth/register
│   ├── POST /api/auth/login
│   └── GET /api/auth/me
├── Diagnostics
│   ├── POST /api/diagnostics/dashboard-stream
│   ├── GET /api/diagnostics/performance?url=...
│   └── GET /api/diagnostics/security?url=...
└── Admin
    ├── GET /api/admin/users
    └── PUT /api/admin/users/:id/role
```

---

## 🤝 Contribución

### Checklist antes de Pull Request

- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run lint` pasa sin warnings críticos
- [ ] Código probado localmente (Frontend + Backend)
- [ ] Commits siguen Conventional Commits
- [ ] Documentación actualizada (si aplica)
- [ ] Sin `console.log` en código final
- [ ] Sin credenciales hardcodeadas

### Code Review Guidelines

**Revisar:**
- ✅ Lógica correcta sin bugs evidentes
- ✅ TypeScript tipado adecuadamente
- ✅ Sin duplicación de código
- ✅ Manejo de errores apropiado
- ✅ Performance aceptable
- ✅ Accesibilidad (si aplica)

**Comentar constructivamente:**
```markdown
# ✅ Bueno
> Considera usar `Promise.allSettled` en vez de `Promise.all` para evitar que una API fallida detenga todas.

# ❌ Evitar
> Esto está mal.
```

---

## 📚 Recursos Adicionales

### Documentación Oficial

- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Express**: https://expressjs.com/
- **MongoDB**: https://www.mongodb.com/docs/
- **TailwindCSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/

### Comunidad

- **Stack Overflow**: https://stackoverflow.com/questions/tagged/reactjs
- **Discord React**: https://discord.gg/reactiflux

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0
