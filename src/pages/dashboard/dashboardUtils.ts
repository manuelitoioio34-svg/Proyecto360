// src/pages/dashboard/dashboardUtils.ts

// Utilidades puras y lógica reutilizable del Dashboard General
import { DIAGNOSTIC_CONFIG, DashboardData, Recommendation } from './dashboardTypes';

export function calculateOverallScore(
  diagnostics: DashboardData['diagnostics']
): number {
  const weights = {
    performance: 0.25,
    security: 0.2,
    accessibility: 0.2,
    reliability: 0.15,
    maintainability: 0.1,
    portability: 0.1,
  };

  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(diagnostics).forEach(([key, value]) => {
    if (value && value.score != null && value.score !== 0) {
      totalScore += value.score * weights[key as keyof typeof weights];
      totalWeight += weights[key as keyof typeof weights];
    }
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente';
  if (score >= 70) return 'Bueno';
  if (score >= 50) return 'Necesita mejoras';
  return 'Crítico';
}

export type InsightResult = Pick<
  DashboardData,
  'insights' | 'aggregatedRecommendations' | 'actionPlan' | 'criticalIssues'
>;

/** Construye insights, plan de acción y issues críticos a partir del snapshot de diagnósticos.
 *  Se usa tanto al restaurar desde cache como al recibir el evento 'complete' del stream. */
export function buildInsightsAndPlan(
  eventDiagnostics: Record<string, { score?: number; recommendations?: Recommendation[]; metrics?: Record<string, unknown> }>
): InsightResult {
  const insights = { strengths: [] as string[], improvements: [] as string[] };

  Object.entries(eventDiagnostics).forEach(([key, value]) => {
    const score = value?.score ?? 0;
    switch (key as keyof typeof DIAGNOSTIC_CONFIG) {
      case 'performance':
        if (score >= 90) insights.strengths.push('Rendimiento sobresaliente: carga rápida y estable (>=90/100).');
        else if (score < 70) insights.improvements.push('Mejora el rendimiento: optimiza LCP, TBT y TTFB; reduce recursos críticos y activa compresión/caché.');
        break;
      case 'security':
        if (score >= 90) insights.strengths.push('Buenas prácticas de seguridad: cabeceras clave configuradas.');
        else if (score < 70) insights.improvements.push('Refuerza seguridad: configura HSTS, CSP, X-Content-Type-Options y X-Frame-Options.');
        break;
      case 'accessibility':
        if (score >= 90) insights.strengths.push('Accesibilidad sólida: contraste y navegación por teclado adecuados.');
        else if (score < 70) insights.improvements.push('Mejora accesibilidad: contraste, textos alternativos, roles/ARIA y foco de teclado.');
        break;
      case 'reliability':
        if (score >= 90) insights.strengths.push('Fiabilidad alta: buena disponibilidad y respuesta estable.');
        else if (score < 70) insights.improvements.push('Mejora fiabilidad: revisa tiempos de respuesta y disponibilidad del servicio.');
        break;
      case 'maintainability':
        if (score >= 90) insights.strengths.push('Mantenibilidad adecuada: stack consistente y actual.');
        else if (score < 70) insights.improvements.push('Mejorar mantenibilidad: actualiza dependencias y reduce complejidad del stack.');
        break;
      case 'portability':
        if (score >= 90) insights.strengths.push('Buena portabilidad: compatibilidad amplia de navegadores.');
        else if (score < 70) insights.improvements.push('Mejorar portabilidad: revisa compatibilidad de funcionalidades en navegadores clave.');
        break;
    }
  });

  const aggregated: DashboardData['aggregatedRecommendations'] = [];
  Object.entries(eventDiagnostics).forEach(([key, value]) => {
    const recs: Recommendation[] = value?.recommendations || [];
    recs.forEach((r) => {
      aggregated!.push({
        type: key as keyof typeof DIAGNOSTIC_CONFIG,
        severity: r.severity,
        title: r.title,
        description: r.description,
        impact: r.impact,
      });
    });
  });

  const sevOrder = { high: 0, medium: 1, low: 2 } as const;
  const typePriority: Record<keyof typeof DIAGNOSTIC_CONFIG, number> = {
    accessibility: 0,
    performance: 1,
    security: 2,
    reliability: 3,
    maintainability: 4,
    portability: 5,
  };
  aggregated!.sort((a, b) => {
    const bySev = sevOrder[a.severity] - sevOrder[b.severity];
    if (bySev !== 0) return bySev;
    return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99);
  });

  const plan = aggregated!.slice(0, 7);

  // Enriquecer fortalezas con métricas adicionales
  const strengthsSet = new Set(insights.strengths);
  const improvementsSet = new Set(insights.improvements);

  try {
    const avail = eventDiagnostics?.reliability?.metrics?.availability as number | undefined;
    if (typeof avail === 'number' && avail >= 99) strengthsSet.add('Alta disponibilidad (>=99%) y respuesta estable.');
  } catch { /* ignore */ }
  try {
    const stackItems = eventDiagnostics?.maintainability?.metrics?.stackItems as number | undefined;
    if (typeof stackItems === 'number' && stackItems >= 3 && stackItems <= 12) strengthsSet.add('Stack tecnológico acotado y coherente.');
  } catch { /* ignore */ }
  try {
    const browsers = (eventDiagnostics?.portability?.metrics?.compatibleBrowsers || []) as unknown[];
    if (Array.isArray(browsers) && browsers.length >= 4) strengthsSet.add('Compatibilidad con múltiples navegadores clave.');
  } catch { /* ignore */ }

  const strengths = Array.from(strengthsSet).slice(0, 10);
  while (strengths.length < 5) {
    const fillers = [
      'Buenas prácticas generales implementadas.',
      'Arquitectura consistente orientada a la experiencia del usuario.',
      'Monitoreo y control de calidad visibles.',
      'Procesos estables de despliegue y operación.',
      'Base técnica sólida para iterar mejoras.',
    ];
    const next = fillers[strengths.length % fillers.length];
    if (!strengths.includes(next)) strengths.push(next); else break;
  }

  for (const r of aggregated!) {
    const label = `${DIAGNOSTIC_CONFIG[r.type].name}: ${r.title}`;
    improvementsSet.add(label);
    if (improvementsSet.size >= 10) break;
  }
  const improvements = Array.from(improvementsSet);
  while (improvements.length < 5) {
    const fillers = [
      'Optimizar rendimiento: Core Web Vitals (LCP, TBT, TTFB).',
      'Fortalecer seguridad (headers y configuraciones).',
      'Mejorar accesibilidad (contraste, alt, ARIA, teclado).',
      'Reducir complejidad del stack y actualizar dependencias.',
      'Verificar compatibilidad en navegadores de alto uso.',
    ];
    const next = fillers[improvements.length % fillers.length];
    if (!improvements.includes(next)) improvements.push(next); else break;
  }

  const criticalIssues = aggregated!
    .filter((r) => r.severity === 'high')
    .slice(0, 5)
    .map((r, idx) => ({
      id: `${r.type}-${idx}`,
      type: r.type as string,
      severity: 'high' as const,
      title: r.title,
      description: r.description,
    }));

  return {
    insights: { strengths, improvements },
    aggregatedRecommendations: aggregated,
    actionPlan: plan,
    criticalIssues,
  };
}

/** Normaliza URL para claves de cache (ignora hash y slash final) */
export function normalizeUrlKey(u: string): string {
  try {
    const parsed = new URL(u);
    parsed.hash = '';
    let s = parsed.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return u.trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
  }
}
