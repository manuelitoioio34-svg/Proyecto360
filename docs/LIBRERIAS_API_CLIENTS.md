# Librerías - API Clients (resumen)

Resumen corto de las librerías usadas por los API clients en el servidor:

- `axios` — Cliente HTTP usado en todos los clients para descargar HTML/realizar requests.
- `axe-core` — Motor de auditoría WCAG (solo en `axeClient.ts`) para detectar violaciones de accesibilidad.
- `jsdom` — Simula DOM en Node para ejecutar `axe-core` sin navegador.
- `crypto` (Node.js) — Usado para generar hashes deterministas en simulaciones.

Clients y propósito:
- `axeClient.ts`: `axios`, `axe-core`, `jsdom`, `crypto` — accesibilidad (WCAG).
- `uptimeClient.ts`: `axios`, `crypto` — disponibilidad y latencia.
- `wappalyzerClient.ts`: `axios`, `crypto` — detección de stack tecnológico.
- `portabilityClient.ts`: `axios`, `crypto` — compatibilidad de navegadores.

Si quieres el documento completo con ejemplos JSON, dímelo y lo pego entero.
