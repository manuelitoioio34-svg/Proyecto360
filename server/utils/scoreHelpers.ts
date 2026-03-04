// server/utils/scoreHelpers.ts
// Helpers de puntuación y recomendaciones para el dashboard general.
// Centraliza getScoreColor, getScoreLabel y generateRecommendations para que
// tanto dashboardCheck como dashboardCheckStream los reutilicen sin duplicar.

/** Devuelve el color hex del score (3 niveles: verde / naranja / rojo) */
export function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e"; // Bueno
  if (score >= 50) return "#f59e0b"; // Medio
  return "#ef4444";                  // Malo
}

/** Devuelve la etiqueta textual del score */
export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excelente";
  if (score >= 70) return "Bueno";
  if (score >= 50) return "Necesita mejoras";
  return "Crítico";
}

type RecoSeverity = "high" | "medium" | "low";
export interface Recommendation {
  severity: RecoSeverity;
  title: string;
  description: string;
  impact?: string;
}

/**
 * Genera recomendaciones concretas a partir del payload crudo de cada API.
 * Extrae directamente de actionPlan / opportunities / findings según la API.
 */
export function generateRecommendations(apiName: string, rawResult: any): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. PRIORIDAD: actionPlan si existe (axeClient, uptimeClient, wappalyzerClient)
  if (Array.isArray(rawResult?.actionPlan) && rawResult.actionPlan.length > 0) {
    rawResult.actionPlan.slice(0, 5).forEach((item: any) => {
      recommendations.push({
        severity: item.severity || "medium",
        title: item.title || "Recomendación",
        description: item.recommendation || item.description || "",
        impact: item.impact || undefined,
      });
    });
    return recommendations;
  }

  // 2. Security: findings array
  if (apiName === "security" && Array.isArray(rawResult?.findings)) {
    const mapSeverity = (s: any): RecoSeverity => {
      const v = String(s || "").toLowerCase();
      if (v === "critical" || v === "high" || v === "error" || v === "severe") return "high";
      if (v === "warning" || v === "medium" || v === "moderate") return "medium";
      return "low";
    };
    rawResult.findings.slice(0, 5).forEach((finding: any) => {
      recommendations.push({
        severity: mapSeverity(finding.severity),
        title: finding.header || finding.title || finding.name || "Problema de seguridad",
        description: finding.message || finding.description || "Revisar configuración de seguridad",
        impact: "Seguridad",
      });
    });
    if (recommendations.length > 0) return recommendations;
  }

  // 3. Performance: métricas reales
  if (apiName === "performance") {
    const metrics = rawResult?.metrics || {};
    const score = rawResult?.score || 0;
    const lcp = metrics?.lcp || metrics?.largestContentfulPaint || 0;
    if (lcp > 2.5) {
      recommendations.push({
        severity: lcp > 4 ? "high" : "medium",
        title: `LCP: ${lcp.toFixed(2)}s`,
        description: "Optimiza la imagen/recurso más grande. Usa formatos WebP/AVIF, preload y CDN.",
        impact: "SEO y UX",
      });
    }
    const tbt = metrics?.tbt || metrics?.totalBlockingTime || 0;
    if (tbt > 300) {
      recommendations.push({
        severity: tbt > 600 ? "high" : "medium",
        title: `TBT: ${Math.round(tbt)}ms`,
        description: "Reduce JavaScript: aplica code-splitting, lazy loading y defer en scripts no críticos.",
        impact: "Interactividad",
      });
    }
    const fcp = metrics?.fcp || metrics?.firstContentfulPaint || 0;
    if (fcp > 1.8) {
      recommendations.push({
        severity: fcp > 3 ? "high" : "medium",
        title: `FCP: ${fcp.toFixed(2)}s`,
        description: "Elimina recursos bloqueantes. CSS crítico inline, usa defer/async en scripts.",
        impact: "Perceived Load",
      });
    }
    const cls = metrics?.cls || metrics?.cumulativeLayoutShift || 0;
    if (cls > 0.1) {
      recommendations.push({
        severity: cls > 0.25 ? "high" : "medium",
        title: `CLS: ${cls.toFixed(3)}`,
        description: "Reserva espacio para imágenes/ads. Evita insertar contenido dinámico arriba del fold.",
        impact: "Estabilidad Visual",
      });
    }
    const si = metrics?.si || metrics?.speedIndex || 0;
    if (si > 3.4) {
      recommendations.push({
        severity: "medium",
        title: `Speed Index: ${si.toFixed(2)}s`,
        description: "Optimiza renderizado above-the-fold. Prioriza contenido visible primero.",
        impact: "UX",
      });
    }
    if (score < 50 && recommendations.length === 0) {
      recommendations.push({
        severity: "high",
        title: `Performance bajo: ${score}/100`,
        description: "Optimiza Core Web Vitals: LCP, FID, CLS. Prioriza recursos críticos y reduce JavaScript.",
        impact: "SEO y Conversión",
      });
    }
    return recommendations.slice(0, 5);
  }

  // 4. Accessibility: violations details
  if (apiName === "accessibility") {
    const details = rawResult?.details || {};
    const violations = details?.violations || [];
    if (Array.isArray(violations) && violations.length > 0) {
      violations.slice(0, 5).forEach((violation: any) => {
        recommendations.push({
          severity:
            violation.impact === "critical" || violation.impact === "serious" ? "high" :
            violation.impact === "moderate" ? "medium" : "low",
          title: violation.help || violation.description || "Inconformidad WCAG",
          description: violation.description || violation.help || `${violation.nodes || 0} elementos afectados`,
          impact: "Accesibilidad",
        });
      });
      return recommendations;
    }
    const metrics = rawResult?.metrics || {};
    const violationCount = metrics?.violations || 0;
    const critical = metrics?.critical || 0;
    const serious = metrics?.serious || 0;
    if (violationCount > 0) {
      recommendations.push({
        severity: critical > 0 || serious > 0 ? "high" : "medium",
        title: `${violationCount} inconformidades WCAG detectadas`,
        description: `${critical} críticas, ${serious} serias. Prioriza: contraste de color, etiquetas alt, ARIA y teclado.`,
        impact: "Accesibilidad",
      });
    }
    return recommendations.slice(0, 5);
  }

  // 5. Reliability
  if (apiName === "reliability") {
    const metrics = rawResult?.metrics || {};
    const availability = metrics?.availability ?? 100;
    const avgResponseTime = metrics?.avgResponseTime || 0;
    if (availability < 99) {
      recommendations.push({
        severity: availability < 95 ? "high" : "medium",
        title: `Disponibilidad: ${availability.toFixed(1)}%`,
        description: "Implementa redundancia, balanceo de carga y monitoreo activo 24/7.",
        impact: "Uptime",
      });
    }
    if (avgResponseTime > 500) {
      recommendations.push({
        severity: avgResponseTime > 1000 ? "high" : "medium",
        title: `Latencia: ${Math.round(avgResponseTime)}ms`,
        description: "Optimiza backend: usa caché (Redis), CDN, índices en BD y keep-alive.",
        impact: "Performance",
      });
    }
    return recommendations.slice(0, 5);
  }

  // 6. Maintainability
  if (apiName === "maintainability") {
    const details = rawResult?.details || {};
    const technologies = details?.technologies || [];
    const stackItems = rawResult?.metrics?.stackItems || 0;
    if (stackItems > 15) {
      recommendations.push({
        severity: "medium",
        title: `${stackItems} tecnologías detectadas`,
        description: "Stack complejo. Evalúa consolidar librerías similares y eliminar dependencias no usadas.",
        impact: "Deuda técnica",
      });
    }
    if (Array.isArray(technologies) && technologies.length > 0) {
      const mainTechs = technologies.slice(0, 3).map((t: any) => t.name).join(", ");
      recommendations.push({
        severity: "low",
        title: "Stack principal",
        description: `${mainTechs}${technologies.length > 3 ? ", ..." : ""}`,
        impact: "Info",
      });
    }
    return recommendations.slice(0, 5);
  }

  // 7. Portability
  if (apiName === "portability") {
    const metrics = rawResult?.metrics || {};
    const compatibleBrowsers = metrics?.compatibleBrowsers || [];
    const incompatibilities = metrics?.incompatibilities || 0;
    if (compatibleBrowsers.length < 4) {
      recommendations.push({
        severity: "high",
        title: `Solo ${compatibleBrowsers.length}/4 navegadores compatibles`,
        description: "Usa autoprefixer, polyfills y transpilación (Babel) para ampliar soporte.",
        impact: "Alcance",
      });
    }
    if (incompatibilities > 0) {
      recommendations.push({
        severity: incompatibilities > 10 ? "high" : "medium",
        title: `${incompatibilities} incompatibilidades`,
        description: "APIs web modernas sin soporte universal. Verifica en caniuse.com y agrega polyfills.",
        impact: "Cross-browser",
      });
    }
    return recommendations.slice(0, 5);
  }

  return [];
}