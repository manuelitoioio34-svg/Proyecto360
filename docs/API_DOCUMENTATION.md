# 📚 Documentación de APIs - Pulse Diagnostics

## Resumen Ejecutivo

**Vision web 360** es una plataforma integral de diagnóstico web que analiza 6 dimensiones críticas de calidad web utilizando herramientas y estándares reconocidos mundialmente. Este documento detalla cada API, sus fuentes de datos y por qué son confiables para uso en producción con miles de usuarios.

---

## 🚀 1. Performance (Lighthouse/PageSpeed Insights)

### ¿Qué analiza?
- **Rendimiento**: LCP, FID, CLS, FCP, Speed Index, TTI
- **SEO**: Meta tags, estructura de headings, robots.txt, sitemap
- **Accesibilidad básica**: Contraste, alt text, ARIA
- **Mejores prácticas**: HTTPS, consola sin errores, bibliotecas actualizadas
- **PWA**: Service workers, manifest, instalabilidad

### Fuente de datos
- **Google Lighthouse** v11.x (open source)
- Motor de auditoría oficial de Chrome DevTools
- Se ejecuta en navegador headless (Chromium)
- Simula condiciones de red (Mobile 3G/4G, Desktop)

### ¿Por qué es confiable?

| Criterio | Evidencia |
|----------|-----------|
| **Desarrollador** | Google Chrome Team |
| **Adopción** | Usado por +10M desarrolladores globalmente |
| **Estándar** | Base del PageSpeed Insights oficial de Google |
| **Impacto SEO** | Core Web Vitals son factor de ranking en Google Search |
| **Open Source** | 27,000+ stars en GitHub |
| **Mantenimiento** | Actualizaciones mensuales con últimas prácticas web |
| **Certificación** | Cumple con Web Vitals (Google I/O 2020) |

### Implementación
```typescript
// server/utils/lh.ts
import lighthouse from 'lighthouse';
// Ejecuta auditoría completa con configuración desktop/mobile
```

### Métricas clave
- **Score general**: 0-100 (promedio ponderado de categorías)
- **LCP** (Largest Contentful Paint): < 2.5s = Bueno
- **FID** (First Input Delay): < 100ms = Bueno
- **CLS** (Cumulative Layout Shift): < 0.1 = Bueno

---

## 🛡️ 2. Seguridad (HTTP Security Headers)

### ¿Qué analiza?
- **Headers de seguridad**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Cookies**: Flags Secure, HttpOnly, SameSite
- **Protocolos**: HTTPS, TLS version, certificado SSL
- **Exposición de información**: Server headers, X-Powered-By

### Fuente de datos
- **Solicitudes HTTP directas** a la URL objetivo
- **Análisis de headers de respuesta** HTTP/HTTPS
- **Reglas basadas en OWASP** Top 10 y Mozilla Observatory

### ¿Por qué es confiable?

| Criterio | Evidencia |
|----------|-----------|
| **Estándar** | Basado en OWASP Top 10 (estándar global de seguridad web) |
| **Referencias** | Mozilla Observatory, SecurityHeaders.com |
| **Documentación** | MDN Web Docs (Mozilla Developer Network) |
| **Frameworks** | Alineado con NIST Cybersecurity Framework |
| **No intrusivo** | Solo lectura de headers públicos (no escaneo de vulnerabilidades) |
| **Compliance** | Ayuda con GDPR, PCI-DSS, SOC2 |

### Implementación
```typescript
// server/controllers/diagnostic.controller.ts
export async function securityCheck(url: string) {
  // Analiza headers HTTP y valida contra best practices
}
```

### Headers evaluados
- **Content-Security-Policy**: Previene XSS
- **Strict-Transport-Security**: Fuerza HTTPS
- **X-Frame-Options**: Previene clickjacking
- **X-Content-Type-Options**: Previene MIME sniffing
- **Referrer-Policy**: Controla información de referencia
- **Permissions-Policy**: Controla APIs del navegador

---

## ♿ 3. Accesibilidad (axe-core)

### ¿Qué analiza?
- **WCAG 2.1 Nivel A/AA**: 90+ reglas automáticas
- **Contraste de colores**: Ratio mínimo 4.5:1
- **Textos alternativos**: Alt en imágenes, labels en forms
- **Navegación por teclado**: Focus, tab order, skip links
- **Roles ARIA**: Uso correcto de roles y atributos

### Fuente de datos
- **axe-core** by Deque Systems
- Análisis del DOM (Document Object Model)
- Motor de testing de accesibilidad más usado del mundo

### ¿Por qué es confiable?

| Criterio | Evidencia |
|----------|-----------|
| **Desarrollador** | Deque Systems (líder mundial en accesibilidad) |
| **Adopción empresarial** | Microsoft, Google, IBM, Gov.UK |
| **Certificación** | W3C (World Wide Web Consortium) |
| **Estándar** | WCAG 2.1 Nivel A y AA completo |
| **Integración** | Chrome DevTools, Firefox DevTools, React, Angular |
| **Open Source** | 5,500+ stars en GitHub |
| **Cobertura** | 57% de problemas detectables automáticamente (resto requiere revisión manual) |

### Implementación
```typescript
// server/utils/apiClients/axeClient.ts
import axe from 'axe-core';
// Ejecuta reglas WCAG sobre el DOM renderizado
```

### Clasificación de violaciones
- **Critical**: Bloquea completamente el acceso (ej: imágenes sin alt)
- **Serious**: Dificulta significativamente el uso (ej: contraste bajo)
- **Moderate**: Causa problemas a algunos usuarios (ej: labels faltantes)
- **Minor**: Mejoras menores (ej: landmarks redundantes)

---

## ✅ 4. Fiabilidad (Uptime & Response Time)

### ¿Qué analiza?
- **Disponibilidad** (uptime): Porcentaje de respuestas exitosas
- **Tiempo de respuesta**: Latencia promedio en milisegundos
- **Códigos de estado**: 2xx (éxito), 3xx (redirección), 4xx/5xx (error)
- **Redirecciones**: Detección de cadenas de redirección
- **Caché**: Validación de headers Cache-Control

### Fuente de datos
- **Sondeos HTTP directos**: 3 peticiones GET consecutivas
- **Medición de latencia**: Timestamp request → response
- **Headers de respuesta**: Cache-Control, ETag, Expires

### ¿Por qué es confiable?

| Criterio | Evidencia |
|----------|-----------|
| **Método estándar** | Usado por UptimeRobot, Pingdom, StatusCake |
| **Medición directa** | Sin intermediarios, latencia real |
| **Protocolo HTTP** | Estándar RFC 2616/7230 (HTTP/1.1 y HTTP/2) |
| **Escalable** | Puede integrarse con APIs externas (Better Uptime, Pingdom) |
| **Métrica SLA** | Base para acuerdos de nivel de servicio (99.9% uptime) |

### Implementación
```typescript
// server/utils/apiClients/uptimeClient.ts
export async function runUptimeCheck(url: string) {
  // Hace 3 intentos, calcula availability y avgResponseTime
}
```

### Métricas clave
- **Availability**: (Respuestas exitosas / Total intentos) × 100
- **Response Time**: Promedio de latencias en ms
- **Uptime SLA**:
  - 99.9% = 43.2 min downtime/mes
  - 99.99% = 4.32 min downtime/mes

---

## 🧩 5. Mantenibilidad (Stack Analysis)

### ¿Qué analiza?
- **Tecnologías usadas**: Frameworks, CMS, CDN, Analytics
- **Versiones de software**: Detección de bibliotecas JavaScript
- **Dependencias**: Librerías de terceros, widgets, plugins
- **Seguridad**: Identificación de versiones obsoletas/vulnerables

### Fuente de datos
- **Wappalyzer**: Base de datos de 3,000+ tecnologías web
- **Análisis heurístico**: Patrones en HTML, CSS, JS, headers, cookies
- **Fingerprinting**: Firmas únicas de frameworks (ej: `X-Powered-By: Express`)

### ¿Por qué es confiable?

| Criterio | Evidencia |
|----------|-----------|
| **Desarrollador** | Wappalyzer (empresa holandesa, fundada 2008) |
| **Adopción** | 1M+ usuarios de extensión de navegador |
| **Base de datos** | Open source, mantenida por comunidad |
| **Empresas que la usan** | BuiltWith, SimilarTech, Lead411, Hunter.io |
| **Actualizaciones** | Nueva tecnología añadida semanalmente |
| **Precisión** | 90%+ en tecnologías populares (React, WordPress, Google Analytics) |

### Implementación
```typescript
// server/utils/apiClients/wappalyzerClient.ts
import Wappalyzer from 'wappalyzer';
// Detecta tecnologías analizando HTML, headers, scripts
```

### Categorías detectadas
- **CMS**: WordPress, Drupal, Joomla
- **JavaScript Frameworks**: React, Vue, Angular
- **CDN**: Cloudflare, Akamai, Fastly
- **Analytics**: Google Analytics, Hotjar, Mixpanel
- **E-commerce**: Shopify, WooCommerce, Magento
- **Marketing**: HubSpot, Mailchimp, Intercom

---

## 🌐 6. Portabilidad (Browser Compatibility)

### ¿Qué analiza?
- **Compatibilidad con navegadores**: Chrome, Edge, Firefox, Safari
- **Features CSS**: Grid, Flexbox, Custom Properties, Container Queries
- **Features JavaScript**: ES Modules, Async/Await, Fetch API, Promises
- **APIs del navegador**: Service Workers, Web Components, IntersectionObserver

### Fuente de datos
- **MDN Browser Compat Data (BCD)**: Base de datos oficial de Mozilla
- **Can I Use**: Referencia cruzada de compatibilidad
- **Detección de features**: Análisis de HTML/CSS/JS usado en el sitio

### ¿Por qué es confiable?

| Criterio | Evidencia |
|----------|-----------|
| **Desarrollador** | Mozilla, Google, Microsoft, Samsung (colaborativo) |
| **Estándar oficial** | MDN Web Docs es la referencia de estándares web |
| **Mantenimiento** | Ingenieros de todos los navegadores principales contribuyen |
| **Open Source** | 4,500+ stars en GitHub |
| **Cobertura** | 15,000+ features documentadas |
| **Uso en producción** | Can I Use, WebPlatform.org, Babel, PostCSS |
| **Actualización** | Datos actualizados con cada versión de navegador |

### Implementación
```typescript
// server/utils/apiClients/portabilityClient.ts
import bcd from '@mdn/browser-compat-data';
// Cruza features usadas con tabla de compatibilidad
```

### Features evaluadas
- **ES Modules**: `import/export` syntax
- **CSS Grid**: `display: grid`
- **CSS Flexbox**: `display: flex`
- **Backdrop Filter**: `backdrop-filter: blur()`
- **Position Sticky**: `position: sticky`
- **Container Queries**: `@container`
- **CSS Subgrid**: `grid-template-columns: subgrid`

---

## 📊 Score General del Dashboard

El **score general** se calcula como promedio ponderado de las 6 métricas:

```typescript
const overallScore = 
  (performance × 0.25) +      // 25% - Impacta SEO y UX
  (security × 0.20) +         // 20% - Protección de datos
  (accessibility × 0.20) +    // 20% - Inclusión y cumplimiento legal
  (reliability × 0.15) +      // 15% - Disponibilidad del servicio
  (maintainability × 0.10) +  // 10% - Deuda técnica
  (portability × 0.10);       // 10% - Alcance de audiencia
```

### Clasificación de scores
- **90-100**: 🟢 Excelente - Sitio de clase mundial
- **70-89**: 🟡 Bueno - Cumple estándares, mejoras menores
- **50-69**: 🟠 Necesita atención - Problemas moderados
- **0-49**: 🔴 Crítico - Requiere acción inmediata

---

## 🔒 Privacidad y Seguridad

### Datos procesados
- **Solo análisis de frontend público**: HTML, CSS, JS, headers HTTP
- **No se accede a**: Bases de datos, APIs privadas, código fuente del servidor
- **No se almacenan**: Contenidos de páginas, datos de usuarios del sitio analizado

### Limitaciones
- **No es un pentest**: No realiza pruebas de penetración ni escaneo de vulnerabilidades
- **Solo superficie pública**: No analiza áreas autenticadas o protegidas
- **Snapshot en el tiempo**: Resultados válidos para el momento del análisis

---

## 📈 Comparación con Herramientas Similares

| Herramienta | Performance | Seguridad | A11y | Uptime | Stack | Compatibilidad |
|------------|-------------|-----------|------|--------|-------|----------------|
| **Pulse** | ✅ Lighthouse | ✅ Headers | ✅ axe-core | ✅ Propio | ✅ Wappalyzer | ✅ MDN BCD |
| PageSpeed Insights | ✅ | ❌ | Básica | ❌ | ❌ | ❌ |
| SecurityHeaders.com | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| WAVE by WebAIM | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| UptimeRobot | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| BuiltWith | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Can I Use | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Manual |

**Ventaja competitiva**: Pulse es la única plataforma que integra las 6 dimensiones en un solo análisis.

---

## 🎯 Casos de Uso

### Para Desarrolladores
- Pre-deploy checklist antes de lanzar a producción
- Monitoreo continuo de Core Web Vitals
- Identificación de deuda técnica (tecnologías obsoletas)

### Para Product Managers
- Priorización de mejoras basada en impacto
- Benchmarking contra competencia
- Reportes ejecutivos con score general

### Para Equipos de Seguridad
- Auditoría de headers de seguridad
- Compliance con OWASP Top 10
- Validación de configuraciones SSL/TLS

### Para Equipos de Accesibilidad
- Cumplimiento WCAG 2.1 Nivel AA
- Preparación para auditorías ADA/Section 508
- Identificación de barreras de acceso

---

## 📚 Referencias y Recursos

### Performance
- [Web.dev - Core Web Vitals](https://web.dev/vitals/)
- [Lighthouse GitHub](https://github.com/GoogleChrome/lighthouse)
- [PageSpeed Insights](https://pagespeed.web.dev/)

### Seguridad
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)

### Accesibilidad
- [axe-core GitHub](https://github.com/dequelabs/axe-core)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)

### Stack Analysis
- [Wappalyzer](https://www.wappalyzer.com/)
- [BuiltWith](https://builtwith.com/)

### Compatibilidad
- [MDN Browser Compat Data](https://github.com/mdn/browser-compat-data)
- [Can I Use](https://caniuse.com/)

---

**Última actualización**: Enero 2026  
**Versión**: 1.0  
**Licencia**: Documentación técnica de uso interno
