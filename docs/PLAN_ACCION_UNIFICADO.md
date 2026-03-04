# Plan de Acción Unificado (resumen)

- Se calcula un `overallScore` como PROMEDIO PONDERADO de 6 dimensiones:
  - `performance` 25%
  - `security` 20%
  - `accessibility` 20%
  - `reliability` 15%
  - `maintainability` 10%
  - `portability` 10%

Fórmula:

```
overall = Σ(score[i] × peso[i]) / Σ(peso[i])
```

Flujo:
1. El servidor ejecuta 6 APIs en paralelo (performance, security, accessibility, reliability, maintainability, portability).
2. Cada API devuelve `score` y `recommendations`.
3. Se calculan contribuciones ponderadas (score × peso) y se normaliza dividiendo por la suma de pesos.
4. El frontend muestra: Score general, Fortalezas (score ≥ 90) y Oportunidades (ordenadas por impacto).

Si quieres el ejemplo numérico paso a paso, lo añado aquí.
