// src/components/security/SecuritySummaryPanel.tsx
// Panel lateral del resumen: estado de pruebas + estado de encabezados
import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { SecurityFinding, SecurityHistoryItem } from '../../shared/types/api';
import { HeaderStatusBars } from './SecurityCharts';
import { AccessBanner } from '../../shared/ui/access-banner';

interface Props {
  securityResult: Record<string, unknown>;
  securityHistory: SecurityHistoryItem[];
  userRole?: string;
}

export function SecuritySummaryPanel({ securityResult, userRole }: Props) {
  const [showTestsTooltip, setShowTestsTooltip] = useState(false);
  const [showHeadersTooltip, setShowHeadersTooltip] = useState(false);

  if (userRole === 'cliente') {
    return (
      <AccessBanner title="Acceso limitado al histórico">
        Con el rol cliente verás un resumen. El detalle del histórico está restringido.
      </AccessBanner>
    );
  }

  const findings = Array.isArray(securityResult?.findings)
    ? (securityResult.findings as SecurityFinding[])
    : [];

  const passedCount =
    (securityResult?.summary as Record<string, unknown>)?.passed ??
    (securityResult?.passCount as number) ??
    findings.filter((f) => f?.passed).length;

  const warningCount =
    (securityResult?.summary as Record<string, unknown>)?.warnings ??
    (securityResult?.warningCount as number) ??
    '-';

  const failedCount =
    (securityResult?.summary as Record<string, unknown>)?.failed ??
    (securityResult?.failCount as number) ??
    findings.filter((f) => !(f as Record<string, unknown>)?.passed).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4 flex items-center justify-center gap-2">
          Datos del Histórico de Seguridad
        </h3>
      </div>

      {/* Estado de pruebas */}
      <div className="rounded-lg border border-slate-200 dark:border-[#1e2d45] p-4 bg-white dark:bg-[#13203a]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            📊 Estado de Pruebas
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#162440] px-2 py-1 rounded-full">
              Histórico
            </span>
            <div className="relative tooltip-container">
              <button
                type="button"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition"
                title="Información sobre el estado de pruebas"
                onClick={() => setShowTestsTooltip((v) => !v)}
              >
                <Info size={12} strokeWidth={2.4} />
              </button>
              {showTestsTooltip && (
                <div className="absolute right-0 top-6 z-50 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg border">
                  <div className="font-semibold mb-2">Estado de Pruebas de Seguridad</div>
                  <div className="space-y-1 leading-relaxed">
                    <div>
                      <strong className="text-green-300">Revisadas:</strong> Pruebas que
                      cumplieron los criterios de seguridad
                    </div>
                    <div>
                      <strong className="text-amber-300">Avisos:</strong> Configuraciones que
                      requieren atención
                    </div>
                    <div>
                      <strong className="text-red-300">Mejoras por revisar:</strong> Elementos
                      que necesitan corrección
                    </div>
                  </div>
                  <div className="absolute -top-1 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Revisadas</span>
            <span className="font-bold text-green-600 text-lg">{String(passedCount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Avisos</span>
            <span className="font-bold text-amber-600 text-lg">{String(warningCount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Mejoras por revisar</span>
            <span className="font-bold text-red-600 text-lg">{String(failedCount)}</span>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">📊 Datos del histórico</h3>

      {/* Estado de encabezados */}
      <div className="rounded-lg border border-slate-200 dark:border-[#1e2d45] p-4 bg-white dark:bg-[#13203a]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            🔒 Estado de Encabezados
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#162440] px-2 py-1 rounded-full">
              Histórico
            </span>
            <div className="relative tooltip-container">
              <button
                type="button"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition"
                title="Información sobre encabezados de seguridad"
                onClick={() => setShowHeadersTooltip((v) => !v)}
              >
                <Info size={12} strokeWidth={2.4} />
              </button>
              {showHeadersTooltip && (
                <div className="absolute right-0 top-6 z-50 w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg border">
                  <div className="font-semibold mb-2">Estado de Encabezados de Seguridad</div>
                  <div className="space-y-1 leading-relaxed">
                    <div>
                      Analiza la presencia y configuración de encabezados HTTP críticos:
                    </div>
                    <div>
                      <strong className="text-blue-300">CSP:</strong> Content Security Policy -
                      Previene XSS
                    </div>
                    <div>
                      <strong className="text-emerald-300">HSTS:</strong> Strict Transport
                      Security - Fuerza HTTPS
                    </div>
                    <div>
                      <strong className="text-purple-300">X-Frame-Options:</strong> Previene
                      clickjacking
                    </div>
                  </div>
                  <div className="absolute -top-1 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900" />
                </div>
              )}
            </div>
          </div>
        </div>
        <HeaderStatusBars
          headers={securityResult?.headers as Record<string, unknown> | undefined}
        />
      </div>
    </div>
  );
}
