// src/pages/dashboard/DashboardLoadingStates.tsx

// Estados de carga, error y sin URL del Dashboard General
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { ArrowLeft } from 'lucide-react';
import CircularGauge from '../../components/common/CircularGauge';
import FlipCard from '../../components/dashboard/FlipCard';
import { DashboardData, DIAGNOSTIC_CONFIG, ORDER } from './dashboardTypes';
import { getScoreColor, getScoreLabel } from './dashboardUtils';
import { useDarkMode } from '../../shared/useDarkMode';

// ─── Sin URL ────────────────────────────────────────────────────────────────
export function DashboardNoUrl() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8" data-page="dashboard-general">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dashboard General</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Por favor, proporciona una URL para analizar.</p>
          <Button onClick={() => navigate('/?form=true')} className="mt-4">
            Ir al formulario
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────────────
export function DashboardError({ error }: { error: string | null }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8" data-page="dashboard-general">
      <Card className="max-w-2xl mx-auto border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Error en el análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{error || 'No se pudieron obtener los datos'}</p>
          <Button onClick={() => navigate('/?form=true')} className="mt-4">
            Volver al formulario
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Spinner puro (sin datos aún) ────────────────────────────────────────────
export function DashboardSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" data-page="dashboard-general">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analizando tu sitio web</h3>
              <p className="text-sm text-gray-600">Ejecutando 6 diagnósticos completos...</p>
              <p className="text-xs text-gray-500 mt-2">Los resultados aparecerán progresivamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Progreso parcial (datos parciales mientras carga) ───────────────────────
interface ProgressProps {
  data: DashboardData;
  url: string;
  completedApis: Set<string>;
  navigating: boolean;
  canNavigateDetails: boolean;
  onNavigate: (key: keyof typeof DIAGNOSTIC_CONFIG) => void;
}

export function DashboardProgressView({
  data,
  url,
  completedApis,
  navigating,
  canNavigateDetails,
  onNavigate,
}: ProgressProps) {
  const navigate = useNavigate();
  const { dark } = useDarkMode();
  const overallColor = getScoreColor(data.overallScore);
  const overallLabel = getScoreLabel(data.overallScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8" data-page="dashboard-general">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/?form=true')} className="gap-2 nav-back-btn">
            <ArrowLeft size={16} />
            Nuevo análisis
          </Button>
          <div className="text-right">
            <p className="text-sm text-gray-500">Análisis en progreso...</p>
            <p className="text-xs text-gray-400">{completedApis.size}/6 diagnósticos completados</p>
          </div>
        </div>

        <Card data-pdf-avoid className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <CircularGauge
                  value={data.overallScore}
                  size={140}
                  strokeWidth={12}
                  color={overallColor}
                  textColor={dark ? '#ffffff' : '#111111'}
                  trackColor={dark ? '#333333' : '#e5e7eb'}
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Score General: {data.overallScore}/100
                </h1>
                <p className="text-base font-medium mb-3" style={{ color: overallColor }}>
                  {overallLabel}
                </p>
                <div className="text-sm text-gray-600">
                  <p className="mb-1">🌐 {url}</p>
                  <p className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    Cargando resultados en tiempo real...
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ORDER.map((key) => {
            const config = DIAGNOSTIC_CONFIG[key];
            const diagnostic = data.diagnostics[key];
            const isLoading = !completedApis.has(key) && !diagnostic;
            return (
              <FlipCard
                key={key}
                icon={config.icon}
                name={config.name}
                description={config.description}
                score={diagnostic?.score ?? 0}
                color={diagnostic?.color ?? '#3b82f6'}
                label={diagnostic?.label ?? 'Calculando...'}
                recommendations={diagnostic?.recommendations ?? []}
                loading={isLoading}
                disabled={isLoading || !canNavigateDetails}
                disabledMessage={isLoading ? 'El análisis está en progreso...' : 'No tienes permiso para abrir el detalle desde la interfaz general.'}
                onNavigate={() => {
                  if (!canNavigateDetails || navigating) return;
                  onNavigate(key);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
