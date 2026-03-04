# Manual de Estilo — Diagnóstico Web 360° (Choucair)

> Documento de referencia para el diseño visual de la aplicación web.  
> Mantenido en sincronía con la página interactiva `/style-guide` (acceso: rol Admin).  
> **Uso**: alimentar contexto a IAs codificadoras durante el desarrollo.

---

## Índice

1. [Identidad & Colores](#1-identidad--colores)
2. [Tipografía](#2-tipografía)
3. [Sistema de Grillas y Espaciado](#3-sistema-de-grillas-y-espaciado)
4. [Componentes Base](#4-componentes-base)
5. [Estados y Feedback](#5-estados-y-feedback)
6. [Iconografía](#6-iconografía)
7. [Tono de Voz](#7-tono-de-voz)
8. [Estructura de Páginas](#8-estructura-de-páginas)
9. [Accesibilidad](#9-accesibilidad)
10. [Implementación y Mantenimiento](#10-implementación-y-mantenimiento)

---

## 1. Identidad & Colores

### Paleta corporativa Choucair

| Rol         | Nombre        | Hex       | Uso principal                                |
|-------------|---------------|-----------|----------------------------------------------|
| Primary     | Charcoal      | `#222222` | Fondo principal, texto sobre fondo claro     |
| Secondary   | Lime Green    | `#93D500` | CTAs, highlights, acentos de marca           |
| Success     | Green         | `#9ED919` | Estados de éxito, métricas positivas         |
| Warning     | Amber         | `#E47E3D` | Advertencias, alertas moderadas              |
| Danger      | Red           | `#EA0029` | Errores, eliminaciones, alertas críticas     |
| Info        | Blue          | `#0075C9` | Información, enlaces, estados informativos   |
| Neutral 900 | —             | `#111111` | Fondos oscuros, sidebars                     |
| Neutral 800 | —             | `#222222` | Texto principal (mismo que primary)          |
| Neutral 700 | —             | `#383838` | Subtítulos, labels                           |
| Neutral 600 | —             | `#4E4E4E` | Texto secundario                             |
| Neutral 500 | —             | `#646464` | Placeholders                                 |
| Neutral 400 | —             | `#7A7A7A` | Bordes, separadores                          |
| Neutral 300 | —             | `#9E9E9E` | Disabled states                              |
| Neutral 200 | —             | `#C8C8C8` | Bordes sutiles                               |
| Neutral 100 | —             | `#E8E8E8` | Fondos de inputs, backgrounds suaves         |
| Neutral 50  | —             | `#F5F5F5` | Fondos de página                             |
| Neutral 0   | White         | `#FFFFFF` | Fondos de tarjetas, superficies              |

### Reglas de uso

- **Verde lima (`#93D500`)**: Solo en CTAs primarios y acentos de marca. Nunca como color de texto sobre fondo blanco (contraste insuficiente).
- **Charcoal (`#222222`)**: Color base para textos y fondos oscuros. Contraste WCAG AA garantizado sobre fondos claros.
- **Rojo (`#EA0029`)**: Exclusivo para errores y acciones destructivas.
- **No usar colores fuera de la paleta** salvo grises de sistema (`#e5e7eb`, `#f9fafb`) para bordes y fondos de tablas.

### Tailwind — tokens disponibles

Los colores están registrados en `tailwind.config.cjs`:

```js
// tailwind.config.cjs
colors: {
  primary:   '#222222',
  secondary: '#93D500',
  success:   '#9ED919',
  warning:   '#E47E3D',
  danger:    '#EA0029',
  info:      '#0075C9',
  neutral: { 900: '#111111', 800: '#222222', /* … */ 0: '#FFFFFF' }
}
```

---

## 2. Tipografía

### Fuentes corporativas

| Fuente          | Rol             | CDN                    |
|-----------------|-----------------|------------------------|
| **Roboto**      | Fuente Primaria | Google Fonts           |
| **Courier Prime** | Fuente de Código | Google Fonts         |

Importadas en `index.html` via Google Fonts (weights: Roboto 400/500/600/700, Courier Prime 400/700).

### Escala tipográfica oficial Choucair

| Elemento    | Tamaño | Peso           | Clase CSS          | Uso                              |
|-------------|--------|----------------|--------------------|----------------------------------|
| H1          | 32px   | Bold (700)     | `sg-ts-h1`         | Título principal de página       |
| H2          | 24px   | SemiBold (600) | `sg-ts-h2`         | Secciones principales            |
| H3          | 20px   | SemiBold (600) | `sg-ts-h3`         | Subsecciones                     |
| Body Large  | 16px   | Regular (400)  | `sg-ts-body-large` | Texto introductorio, destacados  |
| Body        | 14px   | Regular (400)  | `sg-ts-body`       | Texto estándar de la interfaz    |
| Caption     | 11px   | Regular (400)  | `sg-ts-caption`    | Labels, notas, metadata          |

### Line-height y interlineado

- **Títulos (H1-H3)**: `line-height: 1.2` — compacto para jerarquía clara.
- **Cuerpo**: `line-height: 1.6` — lectura cómoda.
- **Caption**: `line-height: 1.4` — sin interlineado excesivo.
- **Anchura máxima de lectura**: 60–80 caracteres por línea (aprox. `max-width: 65ch`).

### Reglas

- Siempre usar `font-family: 'Roboto', sans-serif` como fuente principal.
- `font-family: 'Courier Prime', monospace` exclusivamente para bloques de código y valores técnicos.
- No mezclar más de 2 familias tipográficas en una misma vista.

---

## 3. Sistema de Grillas y Espaciado

### Unidad base: 8px

Todos los valores de espaciado derivan de múltiplos de 8px.

### Tokens semánticos de espaciado

| Token | Valor | Descripción                                |
|-------|-------|--------------------------------------------|
| `xs`  | 4px   | Mínimo — separación entre elementos muy próximos (excepción: ½ unidad base) |
| `sm`  | 8px   | Padding de botones, micro-espacios          |
| `md`  | 16px  | Estándar — padding de cards, separación entre campos de formulario |
| `lg`  | 24px  | Separación entre secciones dentro de una vista |
| `xl`  | 32px  | Márgenes grandes, separación entre bloques mayores |

### Breakpoints responsivos oficiales

| Nombre  | Min-width | Descripción                        |
|---------|-----------|------------------------------------|
| Móvil   | 320px     | Dispositivos móviles en adelante   |
| Tablet  | 768px     | Tablets y pantallas medianas       |
| Desktop | 1024px    | Escritorio y pantallas grandes     |

### Implementación en Tailwind

Usar clases de espaciado Tailwind alineadas a la base 8px:

```
xs  → p-1  (4px)
sm  → p-2  (8px)
md  → p-4  (16px)
lg  → p-6  (24px)
xl  → p-8  (32px)
```

Para breakpoints: `md:` (768px) y `lg:` (1024px) son las transiciones principales.

---

## 4. Componentes Base

### Botones

Archivo: `src/shared/ui/button.tsx` (CVA + Radix Slot)

#### Variantes

| Variante      | Fondo       | Texto       | Uso                                      |
|---------------|-------------|-------------|------------------------------------------|
| `default`     | `#93D500`   | `#222222`   | CTA principal — 1 por vista máximo       |
| `secondary`   | `#222222`   | `#FFFFFF`   | Acción secundaria sólida                 |
| `outline`     | Transparente| `#222222`   | Borde charcoal, acciones terciarias      |
| `destructive` | `#EA0029`   | `#FFFFFF`   | Eliminación, acciones destructivas       |
| `ghost`       | Transparente| `#222222`   | Acciones sutiles, sin peso visual        |
| `link`        | —           | `#93D500`   | Navegación inline, texto-enlace          |

#### Tamaños

| Size      | Altura | Padding      |
|-----------|--------|--------------|
| `sm`      | 32px   | px-3         |
| `default` | 36px   | px-4         |
| `lg`      | 40px   | px-6         |
| `icon`    | 36×36  | —            |

#### Uso

```tsx
import { Button } from '@/shared/ui/button'

<Button>Primario</Button>
<Button variant="secondary">Secundario</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Eliminar</Button>
<Button variant="ghost">Ghost</Button>
<Button size="lg">Botón grande</Button>
<Button disabled>Deshabilitado</Button>
```

#### Reglas

- Solo **un botón `default`** (verde lima) por vista como CTA principal.
- Estado `focus-visible`: `ring-3px ring-[#93D500]/40` — WCAG AA.
- Siempre declarar `type="button"` o `type="submit"` explícito.
- Botón deshabilitado: `disabled` prop → `opacity-50 pointer-events-none`.

---

### Inputs de formulario

Archivo: `src/shared/ui/input.tsx`

| Propiedad        | Valor                      |
|------------------|----------------------------|
| Altura           | 40px (`h-10`)              |
| Borde default    | `#E0E0E0`                  |
| Border-radius    | `rounded-md` (6px)         |
| Focus border     | `#93D500`                  |
| Focus ring       | `ring-3px ring-[#93D500]/20` |
| Error border     | `#EA0029` (via `aria-invalid`) |
| Disabled bg      | `#F5F5F5`                  |

```tsx
import { Input } from '@/shared/ui/input'

<Input placeholder="Ingresa una URL…" />
<Input aria-invalid="true" />   {/* estado error */}
<Input disabled />
```

---

## 5. Estados y Feedback

### Spinner

Archivo: `src/shared/ui/spinner.tsx`

- Color del arco activo: `#93D500` (verde lima Choucair)
- Pista de fondo: `#E0E0E0`
- Animación: rotación infinita `0.8s linear`
- Accesible: `role="status"` + `aria-label`

```tsx
import { Spinner } from '@/shared/ui/spinner'

// Tamaño default (24px)
<Spinner />

// Tamaño personalizado
<Spinner size={32} label="Procesando diagnóstico…" />

// Dentro de un botón
<Button disabled>
  <Spinner size={16} /> Cargando…
</Button>
```

### Toast

Archivo: `src/shared/ui/toast.tsx`  
Provider: `<ToastProvider>` en `src/main.tsx` (wrappea toda la app)

| Propiedad  | Valor                                    |
|------------|------------------------------------------|
| Ancho      | 360px (máx `100vw - 32px` en móvil)     |
| Posición   | Esquina inferior derecha (`bottom-5 right-5`) |
| Duración   | 4000ms (auto-dismiss), configurable      |
| `role`     | `alert` + `aria-live="assertive"`        |

#### Variantes de color

| Variante  | Fondo      | Borde      | Texto      | Uso                          |
|-----------|------------|------------|------------|------------------------------|
| `success` | `#f2ffe0`  | `#93D500`  | `#3a5000`  | Operación exitosa            |
| `error`   | `#fff0f2`  | `#EA0029`  | `#7a0015`  | Error, fallo de operación    |
| `info`    | `#e8f4ff`  | `#0075C9`  | `#003d6b`  | Información, estado neutral  |
| `warning` | `#fff6ee`  | `#E47E3D`  | `#7a3a00`  | Advertencia                  |

#### Uso

```tsx
import { useToast } from '@/shared/ui/toast'

function MiComponente() {
  const toast = useToast()

  const handleGuardar = async () => {
    try {
      await guardarDatos()
      toast('Cambios guardados correctamente', 'success')
    } catch (e) {
      toast('Error al guardar. Intenta de nuevo.', 'error')
    }
  }
}
```

---

## 6. Iconografía

### Librería: Lucide React

**Única librería de iconos aprobada**. Ya instalada en el proyecto (`lucide-react`).

```tsx
import { Search, Settings, AlertTriangle } from 'lucide-react';
// Uso estándar:
<Search size={20} />
<Settings size={16} className="text-neutral-600" />
```

### Tamaños estándar

| Contexto               | Tamaño (`size`) |
|------------------------|-----------------|
| Inline en texto        | 14–16px         |
| Botones / labels       | 16px            |
| Cards / secciones      | 20px            |
| Ilustraciones / hero   | 32–48px         |

### Reglas

- Usar siempre el mismo tamaño que el texto acompañante.
- Los iconos usados en botones deben tener `aria-hidden="true"` si el botón tiene texto visible.
- No usar iconos de otras librerías (Font Awesome, Material Icons, Heroicons, etc.) para mantener coherencia visual.
- El color del icono debe derivar del sistema de colores: nunca valores hardcoded fuera de la paleta.

### Iconos de referencia frecuentes

| Icono              | Lucide name          | Uso típico                             |
|--------------------|----------------------|----------------------------------------|
| Búsqueda           | `Search`             | Inputs de búsqueda                     |
| Configuración      | `Settings`           | Paneles de configuración               |
| Advertencia        | `AlertTriangle`      | Alertas moderadas                      |
| Error              | `AlertCircle`        | Estados de error                       |
| Éxito              | `CheckCircle`        | Confirmaciones                         |
| Información        | `Info`               | Tooltips informativos                  |
| Cerrar             | `X`                  | Cerrar modales, dismissable alerts     |
| Menú               | `Menu`               | Hamburger menu                         |
| Usuario            | `User`               | Perfil, auth                           |
| Dashboard          | `LayoutDashboard`    | Navegación principal                   |
| Informe            | `FileText`           | Diagnósticos generados                 |
| Manual de Estilo   | `BookOpen`           | Acceso al style guide                  |

---

## 6. Tono de Voz

### Valores de comunicación

- **Claro**: Usar lenguaje directo, sin tecnicismos innecesarios.
- **Útil**: Siempre orientado a ayudar al usuario a completar su tarea.
- **Profesional**: Mantener tono formal pero accesible.

### Do / Don't — Escritura de UI

| Hacer (Do)                              | Evitar (Don't)                              |
|-----------------------------------------|---------------------------------------------|
| "Analiza tu sitio en 3 pasos"           | "Ejecuta el análisis de diagnóstico web"    |
| "Diagnóstico listo. Revisa los resultados." | "El procesamiento ha finalizado exitosamente." |
| "Error: el URL ingresado no es válido"  | "Se ha producido un error de validación en el campo URL" |
| "Guardar cambios"                       | "Persistir configuración"                   |
| "¿Eliminar este sitio?"                 | "¿Confirmas la acción de eliminación del recurso?" |

### Terminología aprobada

| Término correcto          | Evitar                         |
|---------------------------|--------------------------------|
| Diagnóstico               | Reporte / Report               |
| Sitio web                 | Website / URL                  |
| Puntuación                | Score / Puntaje                |
| Rendimiento               | Performance                    |
| Accesibilidad             | Accessibility                  |
| Guardar                   | Salvar / Save                  |
| Eliminar                  | Borrar / Delete                |
| Configuración             | Settings / Ajustes             |
| Panel de control          | Dashboard                      |

---

## 7. Estructura de Páginas

### Layout estándar de la aplicación

```
┌─────────────────────────────────────────────┐
│  NAVBAR (fijo, altura 60px)                 │
│  Logo | Navegación | Usuario / Auth         │
├──────────────┬──────────────────────────────┤
│  SIDEBAR     │  CONTENIDO PRINCIPAL         │
│  (240px)     │  max-width: 1200px           │
│              │  padding: 32px               │
│  Navegación  │  ┌──────────────────────┐    │
│  secundaria  │  │  PAGE HEADER         │    │
│              │  │  Título + Acciones   │    │
│              │  ├──────────────────────┤    │
│              │  │  CONTENT AREA        │    │
│              │  │  (grids / cards /    │    │
│              │  │   tablas / forms)    │    │
│              │  └──────────────────────┘    │
└──────────────┴──────────────────────────────┘
```

### Jerarquía de páginas

1. **Navbar**: Siempre presente. Fondo `#222222`, logo Choucair, nav links, auth.
2. **Sidebar** (vistas de admin/dashboard): `width: 240px`, fondo `#111111`, nav secundaria con iconos Lucide.
3. **Content Area**: `max-width: 1200px`, centrado, `padding: 32px 24px`.
4. **Page Header**: Título H1 + descripción + botones de acción principales (top-right).
5. **Cards grid**: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px`.

### Patrones de grillas de contenido

```tsx
// 3 columnas (métricas/KPIs)
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// 2 columnas (comparativo)
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

// Lista completa (tabla)
<div className="w-full overflow-x-auto">
```

---

## 9. Accesibilidad

### Estándar: WCAG 2.1 Nivel AA

#### Contraste de color (mínimos)

| Combinación                     | Ratio mínimo | Estado |
|---------------------------------|-------------|--------|
| Texto negro `#222` / blanco     | 4.5:1 AA    | ✅     |
| Texto blanco / `#222222`        | 4.5:1 AA    | ✅     |
| Texto `#222` / verde `#93D500`  | 3.1:1       | ⚠️ Solo texto grande (18px+ / bold) |
| Texto blanco / `#EA0029`        | 4.6:1 AA    | ✅     |
| Texto blanco / `#0075C9`        | 4.5:1 AA    | ✅     |

#### Navegación por teclado

- Todos los elementos interactivos deben ser alcanzables con `Tab`.
- **Focus visible implementado en `Button`**: `focus-visible:ring-[3px] ring-[#93D500]/40`
- No usar `outline: none` sin proporcionar un estilo de foco alternativo.

#### ARIA — implementado en componentes

| Componente | Atributo ARIA                                         |
|------------|-------------------------------------------------------|
| `Spinner`  | `role="status"` + `aria-label="Cargando…"`           |
| `Toast`    | `role="alert"` + `aria-live="assertive"` + `aria-atomic` |
| `Button`   | `aria-label` obligatorio cuando no tiene texto visible |
| `Input`    | `aria-invalid="true"` para estado de error            |
| Iconos     | `aria-hidden="true"` cuando hay texto acompañante     |
| Modales    | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |

#### Semántica HTML

- Usar elementos nativos: `<button>`, `<a>`, `<input>`, `<nav>`, `<main>`, `<section>`, `<h1>`–`<h6>`.
- No usar `<div>` ni `<span>` como elementos interactivos sin rol ARIA.
- Un único `<h1>` por página.
- Jerarquía de headings sin saltar niveles (`h1 → h2 → h3`).

---

## 10. Implementación y Mantenimiento

### Jerarquía de tokens

```
Nivel 1 — design-tokens.css  (variables CSS :root — fuente de verdad)
  ↓
Nivel 2 — tailwind.config.cjs  (tokens Tailwind que consumen las vars CSS)
  ↓
Nivel 3 — Componentes shared/ui/*  (Button, Input, Spinner, Toast)
  ↓
Nivel 4 — Vistas / páginas  (solo clases Tailwind + variables, sin estilos inline)
```

### `src/styles/design-tokens.css` ✅ IMPLEMENTADO

Archivo de variables CSS globales. Importado como **primer** import en `src/index.css`.

```css
:root {
  /* Colores corporativos Choucair */
  --color-primary:   #222222;
  --color-secondary: #93D500;
  --color-success:   #9ED919;
  --color-warning:   #E47E3D;
  --color-error:     #EA0029;
  --color-info:      #0075C9;

  /* Espaciado (base 8px) */
  --spacing-xs: 4px;   --spacing-sm: 8px;
  --spacing-md: 16px;  --spacing-lg: 24px;  --spacing-xl: 32px;

  /* Tipografía */
  --font-family-primary: 'Roboto', sans-serif;
  --font-family-code:    'Courier Prime', monospace;
  --font-size-h1: 32px;  --font-size-h2: 24px;  --font-size-h3: 20px;
  --font-size-body: 14px;  --font-size-caption: 11px;

  /* Estructura */
  --header-height: 60px;
  --sidebar-width: 240px;
  --content-max-width: 1200px;
}
```

### Checklist de PR — Revisión de diseño

Antes de mergear código con cambios visuales:

- [ ] Colores solo de la paleta Choucair (`tailwind.config.cjs` o `var(--color-*)`)
- [ ] Tipografía según escala oficial (H1·32 / H2·24 / H3·20 / Body·14 / Caption·11)
- [ ] Espaciados mediante tokens semánticos (`var(--spacing-*)` o clases Tailwind alineadas)
- [ ] Iconos exclusivamente de `lucide-react`
- [ ] Contraste WCAG 2.1 AA (mínimo 4.5:1 texto normal, 3:1 texto grande)
- [ ] `focus-visible` visible en todos los elementos interactivos
- [ ] Sin `style={{ ... }}` con valores hardcoded de color o espaciado
- [ ] Responsive validado en 320px / 768px / 1024px

### Proceso de actualización del manual

1. Actualizar `docs/MANUAL_DE_ESTILO.md` (este archivo).
2. Si son nuevos tokens: actualizar `src/styles/design-tokens.css` y `tailwind.config.cjs`.
3. Si son nuevos componentes: crear en `src/shared/ui/` siguiendo el patrón existente.
4. Comunicar al equipo antes de mergear.

---

## Estado de implementación

| Sección                        | Estado        | Archivos                                         |
|-------------------------------|---------------|--------------------------------------------------|
| Paleta de colores              | ✅ Completo   | `tailwind.config.cjs`, `design-tokens.css`       |
| Tipografía (Roboto)            | ✅ Completo   | `index.html` (Google Fonts)                      |
| Espaciado base 8px             | ✅ Completo   | `design-tokens.css`                              |
| Breakpoints (320/768/1024)     | ✅ Completo   | `design-tokens.css`                              |
| Button con variantes Choucair  | ✅ Completo   | `src/shared/ui/button.tsx`                       |
| Input (h-10, focus verde)      | ✅ Completo   | `src/shared/ui/input.tsx`                        |
| Spinner accesible              | ✅ Completo   | `src/shared/ui/spinner.tsx`                      |
| Toast system (4 variantes)     | ✅ Completo   | `src/shared/ui/toast.tsx`, `src/main.tsx`        |
| Iconografía (solo Lucide)      | ✅ En uso     | Todo el proyecto                                 |
| Estilos inline en componentes  | ⚠️ Pendiente  | Ver auditoría abajo                              |

---

## Auditoría de estilos inline

Estado actual: los componentes heredados usan `style={{ ... }}` directamente en el JSX. Estos deben migrarse a clases Tailwind o `var(--*)`.

### 🔴 Componentes con estilos inline a migrar

#### `src/components/DiagnosticoView.tsx`
- Múltiples bloques `style={{ display: 'flex', ... }}` → reemplazar con clases Tailwind (`flex`, `items-center`, `gap-*`, `p-*`).
- Colores hardcoded `#64748b`, `#ffffff`, `#16a34a`, `#ef4444` → usar tokens (`var(--color-*)` o clases Tailwind del config).
- `style={{ marginTop: 12 }}` → `mt-3` (Tailwind, base 4px) o `style={{ marginTop: 'var(--spacing-sm)' }}`.

#### `src/components/CategoryBreakdown.tsx`
- `style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}` → `className="font-semibold text-sm text-[#222222]"`
- `style={{ fontSize: 12, color: "#64748b" }}` → `className="text-xs text-[#646464]"`
- Grid inline → `className="grid gap-4"` con CSS Grid Tailwind.

#### `src/components/SecurityScoreWidget.tsx`
- Separadores con `style={{ display: 'flex', ... }}` → extraer como componente `<Divider>` con clases Tailwind.
- Colores dinámicos (`item.color`) son valores runtime (OK mantenerlos inline cuando son calculados).

#### `src/components/SecurityHistoricoView.tsx`
- `style={{ marginBottom: 16 }}` → `mb-4`
- Clase `.spinner` heredada → reemplazar `<div className="spinner" />` por `<Spinner />` de `shared/ui/spinner`.

#### `src/components/HistoricoView.tsx`
- `style={{ marginBottom: '1rem' }}` → `mb-4`
- `style={{ marginTop: '1.5rem', textAlign: 'right' }}` → `mt-6 text-right`

#### `src/components/common/EmailPdfBar.tsx`
- `style={{ color: "#dc2626" }}` → `className="text-[#EA0029]"` (color de error Choucair)
- `style={{ color: "#059669" }}` → `className="text-[#9ED919]"` (color de éxito Choucair)

#### `src/components/dashboard/ActionPlanPanel.tsx`
- `style={{ display: "flex", gap: 12, ... }}` → `className="flex gap-3 items-start justify-between"`

#### `src/pages/full-check/DashboardCalidadWeb.tsx`
- `style={{ color: getScoreColor(score) }}` — **excepción válida**: color calculado dinámicamente en runtime. Documentar como intencional.
- `style={{ height: 1 }}` (data-pdf-stop) — **excepción válida**: marcador de corte PDF.

#### `src/pages/dashboard/DashBoardGeneral.tsx`
- `style={{ color: overallColor }}` — **excepción válida**: color runtime.
- `data-pdf-stop` dividers — **excepción válida**.

#### `src/components/auth/Login.tsx`
- Usa clases Tailwind con valores hardcoded `border-green-200`, `focus:border-[#0f7a3a]` → reemplazar con tokens Choucair: `border-[#E0E0E0]`, `focus:border-[#93D500]`.

### ✅ Excepciones válidas (mantener inline)

Son estilos que **deben** ir inline porque son calculados en runtime:
- Colores de score dinámicos: `style={{ color: getScoreColor(n) }}`
- Anchos de barras de progreso: `style={{ width: \`${pct}%\` }}`
- Dimensiones de SVG/canvas: `style={{ width: size, height: size }}`
- Marcadores PDF: `data-pdf-stop style={{ height: 1 }}`
- Animaciones CSS: `style={{ animation: '...' }}` cuando no hay clase Tailwind equivalente

---

## Archivos clave del sistema de diseño

| Archivo                              | Descripción                                           |
|--------------------------------------|-------------------------------------------------------|
| `src/styles/design-tokens.css`       | Variables CSS — fuente de verdad de tokens            |
| `tailwind.config.cjs`                | Tokens Tailwind (consumen las variables CSS)          |
| `src/shared/ui/button.tsx`           | Button con variantes Choucair (CVA)                   |
| `src/shared/ui/input.tsx`            | Input (h-10, border #E0E0E0, focus verde lima)        |
| `src/shared/ui/spinner.tsx`          | Spinner accesible (role=status, color #93D500)        |
| `src/shared/ui/toast.tsx`            | Toast + ToastProvider + useToast hook                 |
| `src/main.tsx`                       | `<ToastProvider>` en el root                          |
| `src/index.css`                      | Entry point CSS — importa design-tokens.css primero   |
| `index.html`                         | Google Fonts (Roboto + Courier Prime)                 |
| `docs/MANUAL_DE_ESTILO.md`           | Este archivo                                          |

---

*Última actualización: basado en especificaciones oficiales Choucair.*  
*Versión de la aplicación: Diagnóstico Web 360° v1.x*
