// src/components/dashboard/SecurityDiagnosticoPanel.tsx
// Panel principal de diagnóstico de seguridad — orquestador limpio
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Button } from "../../shared/ui/button";
import SecurityScoreWidget from "../SecurityScoreWidget";
import EmailPdfBar from "../common/EmailPdfBar";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Ban } from "lucide-react";
import { AccessBanner, InfoNote } from "../../shared/ui/access-banner";
import { safeParseJSON } from "../../shared/lib/utils";
import {
  SecurityResult,
  SecurityFinding,
  SecurityHistoryItem,
  SecurityAnalyzeResponse,
  SecurityAuditResponse,
} from "../../shared/types/api";

import { SectionDivider, Caret } from "../security/SecuritySectionDivider";
import { SecurityHeadersGrid } from "../security/SecurityHeadersGrid";
import { SecuritySummaryPanel } from "../security/SecuritySummaryPanel";
import { SecurityFindingsPanel } from "../security/SecurityFindingsPanel";
import { SecurityCookiesGrid } from "../security/SecurityCookiesGrid";

export default function SecurityDiagnosticoPanel({
  url,
  autoRunOnMount = true,
  initialResult,
  showInlineHistoryLink = false,
}: {
  url: string;
  autoRunOnMount?: boolean;
  initialResult?: unknown;
  showInlineHistoryLink?: boolean;
}) {
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [securityResult, setSecurityResult] = useState<SecurityResult | null>(null);
  const [securityHistory, setSecurityHistory] = useState<SecurityHistoryItem[]>([]);
  const [showSecurityAbout, setShowSecurityAbout] = useState(false);
  const [expandedHeaders, setExpandedHeaders] = useState<Record<string, boolean>>({});
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const hasRunRef = useRef(false);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const { user } = useAuth();
  const perms = user?.permissions || [];
  const can = (p: string) => user?.role === "admin" || perms.includes(p);
  const canSeeHistory = can("security.view_history");
  const canSecurityHeaders = can("security.view_headers");
  const canSecurityCookies = can("security.view_cookies");
  const canSecurityFindings = can("security.view_findings");
  const canSecurityActionPlan = can("security.view_action_plan");
  const anySecurityBreakdowns =
    canSecurityHeaders || canSecurityCookies || canSecurityFindings;

  const fetchHistory = async (theUrl: string) => {
    if (!canSeeHistory) return;
    try {
      const ts = Date.now();
      const r = await fetch(
        `/api/security/history?url=${encodeURIComponent(theUrl)}&_=${ts}`,
        { headers: { "Cache-Control": "no-cache" } }
      );
      if (!r.ok) return;
      const data = (await safeParseJSON(r)) as SecurityHistoryItem[];
      if (Array.isArray(data)) {
        setSecurityHistory(
          data.map((d) => ({
            fecha: d.fecha,
            score: typeof d.score === "number" ? d.score : null,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (url) void fetchHistory(url);
  }, [url, canSeeHistory]);

  useEffect(() => {
    if (initialResult) {
      setSecurityResult(initialResult as SecurityResult);
      setSecurityError("");
      setSecurityLoading(false);
      hasRunRef.current = true;
    }
  }, [initialResult]);

  const toggleHeaderDetail = (key: string) =>
    setExpandedHeaders((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSecurityDiagnostics = async () => {
    if (!url) return;
    setSecurityLoading(true);
    setSecurityError("");
    setSecurityResult(null);
    try {
      const res = await fetch("/api/security-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await safeParseJSON(res)) as SecurityAnalyzeResponse;
      if (res.ok && !data?.error) {
        setSecurityResult(data);
        void fetchHistory(url);
        return;
      }

      const res2 = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, type: "security", nocache: true }),
      });
      const data2 = (await safeParseJSON(res2)) as SecurityAuditResponse;
      if (!res2.ok || data2?.error)
        throw new Error(data2?.error || "Error en el análisis de seguridad");

      const sec = data2?.audit?.security ?? data2?.security ?? null;
      if (sec) {
        setSecurityResult(sec);
        void fetchHistory(url);
        return;
      }
      throw new Error("Sin datos de seguridad en la respuesta");
    } catch (e: unknown) {
      setSecurityError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSecurityLoading(false);
    }
  };

  useEffect(() => {
    if (autoRunOnMount && !hasRunRef.current) {
      hasRunRef.current = true;
      handleSecurityDiagnostics();
    }
  }, [autoRunOnMount, url]);

  return (
    <Card className="mt-4 bg-gradient-to-br from-white to-slate-50 dark:bg-none dark:from-[#13203a] dark:to-[#0d1626] border-slate-200 dark:border-[#1e2d45] shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:bg-none dark:from-[#162238] dark:to-[#162238] border-b border-slate-200 dark:border-[#1e2d45]">
        <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
          🛡️ Diagnóstico de Seguridad
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 dark:bg-[#13203a]">
        {/* Estado de carga */}
        {securityLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative h-32 rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-[#13203a] dark:via-[#1a2540] dark:to-[#13203a] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/8 to-transparent animate-pulse transform -skew-x-12" />
                </div>
              ))}
            </div>
            <div className="relative h-48 rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-[#13203a] dark:via-[#1a2540] dark:to-[#13203a] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/8 to-transparent animate-pulse transform -skew-x-12" />
            </div>
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-500 border-t-transparent" />
                <span className="font-medium">Ejecutando análisis de seguridad...</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Revisando encabezados HTTP, cookies y configuraciones de seguridad
              </p>
            </div>
          </div>
        )}

        {/* Estado de error */}
        {securityError && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Error en el análisis
                </h3>
                <p className="text-red-700 mb-4">{securityError}</p>
                <Button
                  variant="outline"
                  onClick={handleSecurityDiagnostics}
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  🔄 Reintentar análisis
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!securityLoading && !securityError && !securityResult && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Análisis de Seguridad Disponible
              </h3>
              <p className="text-slate-600 mb-6">
                Inicia el análisis para revisar los encabezados de seguridad HTTP, cookies y
                configuraciones de esta URL.
              </p>
              <Button
                onClick={handleSecurityDiagnostics}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                🚀 Iniciar Análisis de Seguridad
              </Button>
            </div>
          </div>
        )}

        {/* Resultado */}
        {securityResult && (
          <div ref={captureRef} className="flex flex-col gap-6">
            {/* Acerca del análisis */}
            <div className="rounded-lg border border-slate-200 dark:border-[#1e2d45] p-4 bg-slate-50 dark:bg-[#162238]">
              <button
                className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                onClick={() => setShowSecurityAbout((v) => !v)}
                aria-expanded={showSecurityAbout}
                aria-controls="about-panel"
              >
                <Caret open={showSecurityAbout} />
                Acerca del análisis
              </button>
              <div
                id="about-panel"
                className={`text-sm text-slate-600 dark:text-slate-400 mt-2 transition-all ${
                  showSecurityAbout ? "opacity-100" : "opacity-0 hidden"
                }`}
              >
                <div className="space-y-3">
                  <p>
                    El diagnóstico de seguridad se basa exclusivamente en evidencias objetivas de
                    la respuesta HTTP real del sitio (cabeceras, cookies, redirecciones y un
                    análisis superficial del HTML). No inventa datos, no altera el servidor y usa
                    mejores prácticas de referencia (OWASP / MDN).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>✓ Fuente primaria: Cabeceras y cookies reales (verificable)</div>
                    <div>✓ Sin modificación del sistema auditado</div>
                    <div>✓ Reglas alineadas a estándares seguros comunes</div>
                    <div>⚠️ Limitado a superficie de cabeceras (no pentest completo)</div>
                  </div>
                  <p className="text-xs leading-relaxed">
                    <strong>Alcance y limitaciones:</strong> El puntaje constituye un indicador
                    técnico objetivo de la higiene de configuración observable en la capa HTTP.
                    <em>
                      {" "}
                      No certifica cumplimiento normativo ni cubre vulnerabilidades lógicas o de
                      autenticación.
                    </em>
                  </p>
                </div>
              </div>
            </div>

            {/* Resumen */}
            <SectionDivider
              label="Resumen"
              info={
                <>
                  Vista general del estado de seguridad para la URL analizada. El puntaje (0–100)
                  se calcula a partir de reglas de encabezados, cookies y hallazgos.
                </>
              }
            />
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="rounded-lg border border-slate-200 dark:border-[#1e2d45] p-6 bg-gradient-to-br from-white to-slate-50 dark:from-[#13203a] dark:to-[#0d1626]">
                  <SecurityScoreWidget
                    score={
                      securityResult?.score ?? securityResult?.securityScore ?? null
                    }
                    grade={securityResult?.grade}
                    history={securityHistory}
                    topFindings={
                      (Array.isArray(securityResult?.findings)
                        ? (securityResult.findings as SecurityFinding[])
                            .filter(
                              (f) =>
                                f?.severity === "critical" || f?.severity === "warning"
                            )
                            .slice(0, 3)
                        : []) as Array<{ id: string; title: string; severity: string }>
                    }
                  />
                </div>
              </div>
              <div className="lg:w-80">
                <SecuritySummaryPanel
                  securityResult={securityResult as unknown as Record<string, unknown>}
                  securityHistory={securityHistory}
                  userRole={user?.role}
                />
              </div>
            </div>

            {/* Enlace a histórico */}
            {showInlineHistoryLink && url && (
              <div className="mt-2">
                {!canSeeHistory && user?.role === "cliente" ? (
                  <button
                    type="button"
                    className="back-link cursor-not-allowed opacity-60 inline-flex items-center gap-1"
                    title="Histórico restringido"
                    aria-disabled
                  >
                    <Ban size={16} /> Histórico no disponible
                  </button>
                ) : (
                  <Link
                    to={`/security-history?url=${encodeURIComponent(url)}`}
                    className="back-link"
                  >
                    Ver histórico de esta URL
                  </Link>
                )}
              </div>
            )}

            {/* Encabezados */}
            {securityResult?.headers &&
              typeof securityResult.headers === "object" &&
              canSecurityHeaders && (
                <>
                  <SectionDivider
                    label="Encabezados"
                    info={
                      <>
                        Analiza los principales encabezados HTTP de seguridad. Cada tarjeta muestra
                        si el encabezado está presente, su importancia, recomendación y ejemplos
                        para Nginx/Apache/Express.
                      </>
                    }
                  />
                  <div className="flex justify-end mb-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showOnlyMissing}
                        onChange={(e) => setShowOnlyMissing(e.target.checked)}
                        className="rounded"
                      />
                      Solo mostrar faltantes
                    </label>
                  </div>
                  <SecurityHeadersGrid
                    headers={securityResult.headers as Record<string, unknown>}
                    expandedHeaders={expandedHeaders}
                    onToggleHeader={toggleHeaderDetail}
                    showOnlyMissing={showOnlyMissing}
                  />
                </>
              )}

            {/* Cookies */}
            {Array.isArray(securityResult?.cookies) && canSecurityCookies && (
              <SecurityCookiesGrid
                cookies={securityResult.cookies as Record<string, unknown>[]}
              />
            )}

            {/* Aviso encabezados para cliente */}
            {user?.role === "cliente" && !canSecurityHeaders && (
              <AccessBanner title="Acceso limitado – Encabezados">
                El detalle completo de los encabezados está restringido. Solicite permisos
                ampliados.
              </AccessBanner>
            )}

            {/* Hallazgos y plan */}
            <SecurityFindingsPanel
              securityResult={securityResult as unknown as Record<string, unknown>}
              canSecurityFindings={canSecurityFindings}
              canSecurityActionPlan={canSecurityActionPlan}
            />

            {/* Banners de acceso */}
            {!anySecurityBreakdowns && (
              <AccessBanner title="Acceso limitado – Desgloses de seguridad">
                Agrega permisos security.view_headers / security.view_cookies /
                security.view_findings.
              </AccessBanner>
            )}
            {anySecurityBreakdowns && !canSecurityActionPlan && (
              <InfoNote>
                <strong>Nota:</strong> puedes ver desgloses básicos de seguridad pero no el plan
                de acción detallado. Requiere security.view_action_plan.
              </InfoNote>
            )}
          </div>
        )}

        {/* Exportar */}
        {securityResult && (
          <div className="mt-8">
            <SectionDivider
              label="Exportar"
              info={<>Descarga el PDF de este diagnóstico de seguridad.</>}
            />
            <div className="flex justify-end">
              <EmailPdfBar
                captureRef={captureRef}
                url={url}
                subject={`Diagnóstico de Seguridad - ${url}`}
                includePdf={true}
                context="security"
                captureWidthPx={1200}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
