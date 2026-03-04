// src/components/security/SecurityFindingsPanel.tsx
// Sección de hallazgos, errores, mejoras y plan de acción
import React from 'react';
import { AccessBanner, PermCode, InfoNote } from '../../shared/ui/access-banner';
import { SectionDivider } from './SecuritySectionDivider';
import { deriveSecurityPlan } from './securityUtils';

interface Props {
  securityResult: Record<string, unknown>;
  canSecurityFindings: boolean;
  canSecurityActionPlan: boolean;
}

export function SecurityFindingsPanel({
  securityResult,
  canSecurityFindings,
  canSecurityActionPlan,
}: Props) {
  const findings = Array.isArray(securityResult?.findings)
    ? (securityResult.findings as Record<string, unknown>[])
    : [];

  return (
    <>
      {canSecurityFindings && (
        <>
          {findings.length > 0 && (
            <>
              <SectionDivider
                label="Hallazgos"
                info={
                  <>
                    Resultados adicionales derivados de heurísticas y comprobaciones automatizadas.
                    Cada elemento indica si pasó o requiere revisión y su severidad para priorización.
                  </>
                }
              />
              <div>
                <h3 className="text-lg font-semibold mb-2">Hallazgos</h3>
                <div className="flex flex-col gap-2">
                  {findings.map((f, idx) => {
                    const sev = String(f?.severity || '').toLowerCase();
                    const color = sev.includes('high')
                      ? '#ef4444'
                      : sev.includes('medium')
                      ? '#f59e0b'
                      : '#2563eb';
                    const passed = f?.passed === true;
                    return (
                      <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#1e2d45] p-3 bg-white dark:bg-[#13203a]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-medium break-words text-slate-900 dark:text-slate-100">
                            {String(f?.title || f?.id || f?.rule || 'Hallazgo')}
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: passed
                                ? 'rgba(22,163,74,0.1)'
                                : 'rgba(239,68,68,0.1)',
                              color: passed ? '#16a34a' : '#ef4444',
                            }}
                          >
                            {passed ? 'OK' : 'Revisar'}
                          </span>
                        </div>
                        {!!(f?.message || f?.description) && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 break-words">
                            {String(f.message || f.description)}
                          </div>
                        )}
                        {sev && (
                          <div
                            className="text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(37,99,235,0.06)', color }}
                          >
                            Severidad: {String(f?.severity)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Plan de acción derivado */}
          {(() => {
            const d = deriveSecurityPlan(securityResult);
            return (
              <>
                {(d.errors.length > 0 || d.improvements.length > 0 || d.plan.length > 0) &&
                  canSecurityActionPlan && (
                    <SectionDivider
                      label="Plan de acción"
                      info={
                        <>
                          Lista priorizada generada a partir de fallos y mejoras detectadas. Incluye
                          recomendaciones concretas para implementar los encabezados o ajustes
                          necesarios en tu servidor o aplicación.
                        </>
                      }
                    />
                  )}

                {d.errors.length > 0 && canSecurityActionPlan && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-red-700">
                      Errores detectados
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {d.errors.map((e) => (
                        <li
                          key={e.id}
                          dangerouslySetInnerHTML={{
                            __html: `<strong>${e.title}</strong>: ${e.recommendation}`,
                          }}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {d.improvements.length > 0 && canSecurityActionPlan && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-amber-700">
                      Mejoras recomendadas
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {d.improvements.map((e) => (
                        <li
                          key={e.id}
                          dangerouslySetInnerHTML={{
                            __html: `<strong>${e.title}</strong>: ${e.recommendation}`,
                          }}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {d.plan.length > 0 && canSecurityActionPlan && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Plan de acción</h3>
                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                      {d.plan.map((p) => (
                        <li key={p.id} className="break-words">
                          {p.title} —{' '}
                          <span className="text-slate-600">{p.recommendation}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* Avisos de acceso limitado */}
      {(!canSecurityFindings || !canSecurityActionPlan) && (
        <>
          {!canSecurityFindings && (
            <AccessBanner title="Acceso limitado – Hallazgos">
              Los hallazgos detallados requieren el permiso{' '}
              <PermCode>security.view_findings</PermCode>.
            </AccessBanner>
          )}
          {!canSecurityActionPlan && (
            <AccessBanner title="Acceso limitado – Plan de acción" className="mb-10">
              El plan de acción completo requiere el permiso{' '}
              <PermCode>security.view_action_plan</PermCode>.
            </AccessBanner>
          )}
        </>
      )}
    </>
  );
}
