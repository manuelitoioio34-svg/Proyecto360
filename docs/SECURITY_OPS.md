# Seguridad, Disponibilidad y Operaciones (RESUMEN)

Este documento resume la evaluación de seguridad y disponibilidad de las APIs en entorno productivo, dependencias externas, y la política sugerida de actualización y parches.

---

## 1) Estado general
- Autenticación: JWT firmado con `JWT_SECRET`, cookie `perf_token` en `httpOnly`; contraseñas con `bcrypt`.
- Permisos: `requirePermissions` + caché por rol/usuario implementados.
- Telemetría/Logs: Pino para logging; telemetría parcial presente.
- Hardening pendiente: protección CSRF explícita, WAF, SCA automático en CI, pruebas de pentest periódicas.

---

## 2) Seguridad por grupo de APIs

### Autenticación (`/api/auth/*`)
- Riesgo: medio.
- Protecciones actuales: `bcrypt`, JWT (1d), cookie `httpOnly` + `sameSite=lax`.
- Recomendaciones: implementar refresh tokens o revocation list; rate limit en login; CSRF protection; MFA para admins.

### Diagnósticos (`/api/diagnostics/*`, SSE)
- Riesgo: medio‑alto (input de URLs + carga).
- Amenazas: SSRF, inyección, DoS por auditorías masivas, exposición de datos SSE.
- Recomendaciones: validar/whitelist URLs; rate limiting por IP/usuario; encolar trabajos; timeouts y circuit‑breaker; sanitizar outputs.

### Administración / Usuarios (`/api/admin/*`)
- Riesgo: alto.
- Recomendaciones: forzar MFA para admins, audit logs exhaustivos, IP allowlist opcional y approval workflows si procede.

### Integraciones / Microservicios
- microPagespeed y security-service son componentes aislados; deben ejecutarse en contenedores con límites y health checks.
- Recomendaciones: redes privadas, retries/backoff, circuit‑breaker y caching de resultados.

### Telemetría / Email
- No registrar secretos; encolar envíos de email con reintentos; fallback y alertas si SMTP falla.

### Health / Ready
- No exponer versiones o secretos; usar solo para orchestrator/monitor, readiness debe fallar si dependencias críticas no están OK.

---

## 3) Disponibilidad y tolerancia a fallos
- Redundancia: réplicas del backend y microservicios; Mongo en replica set.
- Escalado: autoscaling por CPU/latency; use colas para trabajos pesados.
- Timeouts/Retries/Circuit Breakers: aplicar en todas las llamadas externas.
- Observabilidad: métricas p95/p99, error rate, queue depth con alertas y runbooks.
- Backups: backups diarios, probar restauración regularmente.

**Degradado controlado:** diseñar la plataforma para devolver resultados parciales si microservicios fallan (p. ej. sin performance), y permitir operación básica del resto.

---

## 4) Dependencias externas y comportamiento cuando fallan
- microPagespeed (Lighthouse): crítico para performance; si cae, se pierde esa dimensión — el sistema debe operar en modo degradado.
- security-service: fallback local (cabeceras) si falla servicio externo.
- Wappalyzer / MDN BCD: cachear resultados y operar con datos parciales.
- SMTP: encolar emails y reintentar; alertar si persistente.

---

## 5) Política de actualización y parcheo
- Automatizar SCA en CI (npm audit / Snyk / Dependabot).
- Versionado de APIs con SemVer y rutas (`/api/v1/...`).
- CI/CD: tests unit/integration/contract; deployments Canary/Blue‑Green o rolling con rollback automatizado.
- Migraciones de DB: versionadas y aplicadas en staging con backups previos.
- Emergencias: hotfix process con runbooks; aplicar parches críticos 24–72h tras validación mínima.

---

## 6) Recomendaciones inmediatas (prioridad)
1. Añadir validación y rate limiting en `POST /api/diagnostics` para prevenir SSRF/DoS.
2. Implementar CSRF protection o usar `Authorization` header para APIs sensibles.
3. Forzar MFA para cuentas admin y auditar cambios de rol.
4. Aislar `microPagespeed` en contenedores con límites y usar cola/worker.
5. Habilitar SCA en CI y pipeline con canary/rollback.
6. Definir runbooks y alertas críticas (DB down, microPagespeed OOM, spike jobs).

---

