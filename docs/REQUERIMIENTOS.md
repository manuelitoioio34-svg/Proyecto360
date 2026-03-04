# Requerimientos y Alcance de APIs

## Resumen
Documento que define el alcance de las APIs y los requerimientos funcionales y no funcionales para la plataforma "Diagnóstico web 360°". Usar en reuniones y como guía de implementación.

---

## Alcance de las APIs (scope)
- Autenticación:
  - `POST /api/auth/register` — registrar usuario (dev/self‑service).
  - `POST /api/auth/login` — login (devuelve cookie httpOnly y token opcional en body).
  - `POST /api/auth/logout` — cerrar sesión (limpia cookie).
  - `GET /api/auth/me` — obtener usuario actual y permisos.
  - `GET /api/auth/permissions` — obtener permisos efectivos.
- Diagnósticos:
  - `POST /api/diagnostics/dashboard-stream` — iniciar auditoría por URL; respuesta SSE con eventos `start`, `result`, `error`, `complete`.
  - `POST /api/diagnostics/run` — ejecutar auditoría síncrona (opcional para testing).
  - `GET /api/diagnostics/:id` — obtener detalle de auditoría.
  - `GET /api/diagnostics` — listar auditorías con filtros (url, user, fecha) y paginación.
  - `POST /api/diagnostics/:id/export` — exportar a PDF/JSON/CSV.
- Administración / Usuarios:
  - `GET /api/admin/users` — listar usuarios (admin).
  - `PUT /api/admin/users/:id/role` — cambiar rol (admin).
  - Endpoints para rolePermissions y audit logs.
- Integraciones / Microservicios:
  - `microPagespeed` (HTTP) — endpoint para lanzar Lighthouse/PageSpeed y devolver resultado.
  - `security-service` (HTTP) — análisis de cabeceras y observatory.

**Nota:** Todos los endpoints protegidos deben usar `requireAuth` y, cuando corresponda, `requirePermissions`.

---

## Requerimientos Funcionales (resumidos)
1. Autenticación segura (registro/login/logout) con JWT y cookie httpOnly.
2. Roles y permisos: Admin / Auditor / Viewer, con comprobación por endpoint.
3. Ejecución de auditoría por URL que dispare 6 pruebas y devuelva progreso vía SSE.
4. Persistencia de auditorías con metadatos (URL, user, timestamp, scores, findings).
5. Listado y filtrado de auditorías con paginación y búsqueda.
6. Export de auditorías (PDF primario; JSON/CSV opcional).
7. Interfaz para administración de usuarios y permisos.
8. Notificaciones por email para recuperación de contraseña y alertas críticas.
9. Registro de telemetría/telemetría básica para latencias y errores.

---

## Requerimientos No Funcionales (resumidos y medibles)
- Rendimiento:
  - 1ª respuesta API < 300 ms.
  - Primer evento SSE (por lo menos una dimensión) < 10 s.
  - Auditoría completa promedio < 60 s (depende microservicios).
- Disponibilidad:
  - Uptime objetivo 99.9% (SLA interno), backups diarios de MongoDB.
- Escalabilidad:
  - Microservicio de auditoría escalable de forma independiente (Docker/K8s).
- Seguridad:
  - JWT expiración 24h; cookies `httpOnly` y `secure` en producción.
  - CSP, HSTS y CORS configurados correctamente.
  - Escaneo de dependencias en CI (SCA).
- Observabilidad:
  - Logs estructurados (Pino) y métricas p95/p99; alertas en error rate y latencia.
- Mantenibilidad:
  - Lint, typecheck y tests críticos en CI; cobertura mínima del 70% en áreas críticas.
- Accesibilidad:
  - Cumplir WCAG 2.1 AA en vistas públicas principales; checks automatizados con `axe` en CI.
- Compatibilidad:
  - Soporte para los últimos 2 versiones de Chrome, Firefox y Edge; pruebas cross‑browser en CI o manuales.

---

## Criterios de aceptación (ejemplos)
- Registro/Login: usuario puede registrarse, recibir cookie y `GET /api/auth/me` retorna su perfil con permisos.
- Dashboard stream: enviar `POST /api/diagnostics/dashboard-stream` con una URL válida devuelve eventos SSE con al menos un `result` y un `complete`.
- Persistencia: cada auditoría finalizada se almacena en la colección `audits` y es recuperable por `GET /api/diagnostics/:id`.

---

## Observaciones operativas
- Mantener TTL/caché para resultados externos (PageSpeed/Wappalyzer) para reducir costos y latencia.
- Ejecutar Lighthouse en microservicio aislado (contenerizado) por la carga de CPU/memoria.

---

