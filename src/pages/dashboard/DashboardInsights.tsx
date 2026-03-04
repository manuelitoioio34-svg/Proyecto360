// src/pages/dashboard/DashboardInsights.tsx

// Panels de fortalezas, mejoras y plan de acción del Dashboard General
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';
import { DashboardData, DIAGNOSTIC_CONFIG } from './dashboardTypes';

// ─── Fortalezas + Mejoras ────────────────────────────────────────────────────
export function DashboardInsights({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-pdf-avoid>
      <Card className="border-2 border-green-200 bg-green-50 overflow-hidden !pt-0" data-pdf-avoid>
        <CardHeader className="bg-green-100 border-b py-5">
          <CardTitle className="flex items-center gap-2 text-green-900 text-lg">
            <CheckCircle size={22} />
            Lo que estás haciendo bien
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <ul className="space-y-2">
            {data.insights.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-green-900" data-pdf-avoid>
                <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200 bg-blue-50 overflow-hidden !pt-0" data-pdf-avoid>
        <CardHeader className="bg-blue-100 border-b py-5">
          <CardTitle className="flex items-center gap-2 text-blue-900 text-lg">
            <TrendingUp size={22} />
            Oportunidades de mejora
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <ul className="space-y-2">
            {data.insights.improvements.map((improvement, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-blue-900" data-pdf-avoid>
                <ChevronRight size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Plan de acción ──────────────────────────────────────────────────────────
export function DashboardActionPlan({
  data,
  canView,
}: {
  data: DashboardData;
  canView: boolean;
}) {
  if (!data.actionPlan || data.actionPlan.length === 0) return null;

  return (
    <>
      <Card className="mt-6 border-2 border-gray-200 bg-white overflow-hidden" data-action-plan="true">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
            Plan de acción recomendado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {!canView ? (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              Esta sección está disponible solo para roles con permisos. Solicita acceso al
              administrador para ver el plan de acción.
            </div>
          ) : (
            <>
              <ol className="space-y-3 list-decimal pl-5">
                {data.actionPlan.map((rec, idx) => (
                  <li key={`step-${idx}`} className="text-sm" data-pdf-avoid>
                    <div className="flex items-start gap-3">
                      <div
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                          rec.severity === 'high'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : rec.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        {rec.severity === 'high' ? 'Alta' : rec.severity === 'medium' ? 'Media' : 'Baja'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{rec.title}</div>
                        {rec.description && (
                          <div className="text-gray-600 mt-0.5">{rec.description}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {DIAGNOSTIC_CONFIG[rec.type].name}
                          {rec.impact ? ` • ${rec.impact}` : ''}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 text-sm text-gray-600">
                Consejo: prioriza primero las tareas "Alta" y luego las "Media". Puedes hacer clic
                en cada métrica arriba para ver más detalles.
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div data-pdf-stop style={{ height: 1 }} />
    </>
  );
}
