# 📋 Carta del Proyecto - Pulse

**Plataforma de Diagnóstico Web Integral**

---

## 📑 Información del Documento

| Campo | Valor |
|-------|-------|
| **Nombre del Proyecto** | Pulse - Performance & Quality Platform |
| **Versión del Documento** | 1.0 |
| **Fecha de Emisión** | 15 de Enero, 2025 |
| **Última Actualización** | 30 de Octubre, 2025 |
| **Estado** | Aprobado |
| **Autor** | Equipo Choucair Testing |
| **Sponsor del Proyecto** | Choucair Testing - Gerencia de Innovación |

---

## 📋 Tabla de Contenidos

- [Resumen Ejecutivo](#resumen-ejecutivo)
- [Objetivos del Proyecto](#objetivos-del-proyecto)
- [Alcance del Proyecto](#alcance-del-proyecto)
- [Partes Interesadas](#partes-interesadas)
- [Responsabilidades y Roles](#responsabilidades-y-roles)
- [Entregables Principales](#entregables-principales)

---

## 📖 Resumen Ejecutivo

**Pulse** es una plataforma web integral de diagnóstico y análisis de calidad para aplicaciones web, diseñada para proporcionar evaluaciones técnicas profundas en **6 dimensiones críticas** de calidad: Performance, Security, Accessibility, Reliability, Maintainability y Portability.

### Propósito del Proyecto

Crear una herramienta centralizada que permita a equipos de desarrollo, QA y gestión de proyectos:
- Evaluar la calidad técnica de aplicaciones web de forma automatizada
- Identificar brechas de cumplimiento (WCAG 2.1, OWASP, Core Web Vitals)
- Generar reportes accionables con recomendaciones priorizadas
- Monitorear la evolución de métricas de calidad a lo largo del tiempo

### Justificación del Negocio

En el contexto actual de Choucair Testing, los clientes demandan:
1. **Auditorías técnicas rápidas y confiables** para lanzamientos de productos
2. **Evaluaciones de accesibilidad** conforme a estándares WCAG 2.1
3. **Análisis de seguridad** de cabeceras HTTP y configuraciones
4. **Monitoreo de rendimiento** alineado con Core Web Vitals de Google

**Pulse** consolida estas necesidades en una única plataforma, reduciendo el tiempo de análisis de **5 días a 30 minutos** por sitio web.

### Beneficios Esperados

| Beneficio | Impacto |
|-----------|---------|
| **Reducción de tiempo de análisis** | 95% menos tiempo (de 5 días a 30 min) |
| **Aumento de cobertura** | 6 dimensiones vs 2 tradicionales |
| **Estandarización** | Criterios unificados en todos los proyectos |
| **Trazabilidad** | Histórico completo de auditorías |
| **Ahorro de costos** | $50,000 USD/año en herramientas externas |

---

## 🎯 Objetivos del Proyecto

### Objetivo General

Desarrollar e implementar una plataforma web integral que automatice el análisis de calidad técnica de aplicaciones web, integrando 6 dimensiones de evaluación mediante herramientas reconocidas internacionalmente, con capacidad de procesar 100+ análisis diarios y generar reportes accionables en tiempo real.

### Objetivos Específicos

#### 1. **Objetivos Técnicos**

| ID | Objetivo | Métrica de Éxito |
|----|----------|------------------|
| OT-01 | Integrar Google Lighthouse para análisis de Performance | Score promedio > 85/100 en sitios de referencia |
| OT-02 | Implementar axe-core (Deque) para evaluación de Accesibilidad | Detección de 100% de violaciones críticas WCAG 2.1 |
| OT-03 | Integrar Mozilla Observatory para análisis de Seguridad | Identificación de 95%+ de vulnerabilidades comunes |
| OT-04 | Desarrollar sistema de verificación de disponibilidad (Reliability) | 99.9% de uptime en checks |
| OT-05 | Implementar detección de stack tecnológico (Maintainability) | Identificación correcta de tecnologías en 90%+ de sitios |
| OT-06 | Integrar MDN BCD para análisis de Portability | Cobertura de 4 navegadores principales |
| OT-07 | Desarrollar arquitectura de microservicios escalable | Soportar 100 análisis concurrentes |
| OT-08 | Implementar streaming progresivo (SSE) | Feedback < 500ms por API completada |

#### 2. **Objetivos de Negocio**

| ID | Objetivo | Métrica de Éxito |
|----|----------|------------------|
| ON-01 | Reducir tiempo de análisis manual | De 5 días a 30 minutos (95% reducción) |
| ON-02 | Aumentar capacidad de auditorías | De 20 a 100+ sitios/mes |
| ON-03 | Estandarizar criterios de evaluación | 100% de proyectos con mismos criterios |
| ON-04 | Generar valor diferenciador comercial | 3 clientes nuevos en Q1 2025 |
| ON-05 | Reducir costos de herramientas externas | $50,000 USD/año |

#### 3. **Objetivos de Usuario**

| ID | Objetivo | Métrica de Éxito |
|----|----------|------------------|
| OU-01 | Facilitar ejecución de auditorías | 1 click para iniciar análisis completo |
| OU-02 | Proveer recomendaciones accionables | 80%+ usuarios implementan al menos 3 recomendaciones |
| OU-03 | Permitir seguimiento histórico | 100% de auditorías almacenadas y consultables |
| OU-04 | Generar reportes profesionales | Exportación PDF en < 10 segundos |
| OU-05 | Soportar múltiples roles de usuario | Admin, Auditor, Viewer con permisos diferenciados |

---

## 🎯 Alcance del Proyecto

### Dentro del Alcance (In Scope)

#### ✅ **Funcionalidades Incluidas**

1. **Dashboard General**
   - Vista consolidada con 6 métricas principales
   - FlipCards 3D interactivos con gráficas circulares
   - Streaming progresivo vía SSE
   - Score general ponderado

2. **Análisis de 6 Dimensiones**
   - **Performance**: Google Lighthouse (LCP, FID, CLS, FCP, Speed Index, TTI)
   - **Security**: Mozilla Observatory + Headers Analysis
   - **Accessibility**: axe-core con validación WCAG 2.1 (A, AA, AAA)
   - **Reliability**: Uptime check con 3 reintentos + latencia
   - **Maintainability**: Wappalyzer API + Heurística
   - **Portability**: MDN Browser Compat Data (Chrome, Firefox, Safari, Edge)

3. **Vistas Individuales Detalladas**
   - Métricas específicas por dimensión
   - Recomendaciones priorizadas por severidad
   - Gráficas de evolución temporal
   - Detalles técnicos completos

4. **Sistema de Autenticación y Roles**
   - JWT con expiración configurable
   - 3 roles: Admin, Auditor, Viewer
   - Permisos granulares por endpoint
   - Logs de auditoría administrativa

5. **Histórico de Auditorías**
   - Almacenamiento en MongoDB
   - Filtros por URL, fecha, usuario
   - Comparación temporal de scores
   - Exportación individual a PDF

6. **Arquitectura Técnica**
   - Frontend: React 19 + TypeScript + Vite
   - Backend: Node.js + Express + MongoDB
   - Microservicios independientes (microPagespeed, security-service)
   - Caché Redis (opcional)
   - Docker Compose para deployment

#### ✅ **Entregables**

- Código fuente completo (Frontend + Backend + Microservicios)
- Documentación técnica exhaustiva (15+ documentos)
- Scripts de instalación automatizados
- Docker Compose para desarrollo y producción
- Manual de usuario
- Manual de deployment
