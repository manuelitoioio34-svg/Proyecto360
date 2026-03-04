// src/pages/dashboard/DashboardScoreHero.tsx

// Hero section con score general, gauge y estadísticas rápidas
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import CircularGauge from '../../components/common/CircularGauge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { DashboardData } from './dashboardTypes';
import { getScoreColor, getScoreLabel } from './dashboardUtils';
import { useDarkMode } from '../../shared/useDarkMode';

interface Props {
  data: DashboardData;
}

export function DashboardScoreHero({ data }: Props) {
  const { dark } = useDarkMode();
  const overallColor = getScoreColor(data.overallScore);
  const overallLabel = getScoreLabel(data.overallScore);

  const statusText =
    data.overallScore >= 90
      ? 'Tu sitio web está en excelente forma. Mantén las buenas prácticas implementadas.'
      : data.overallScore >= 70
      ? 'Tu sitio cumple con la mayoría de estándares, pero hay oportunidades de mejora.'
      : data.overallScore >= 50
      ? 'Tu sitio tiene varios aspectos que requieren atención para mejorar la experiencia del usuario.'
      : 'Tu sitio necesita mejoras significativas en múltiples áreas críticas.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card data-score-hero="true" className="bg-gradient-to-br from-white to-gray-50 border-2 shadow-lg overflow-hidden" data-pdf-avoid>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-center text-xl">
            Puntuación General de Calidad Web
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Gauge */}
            <div className="flex flex-col items-center justify-center">
              <CircularGauge
                value={data.overallScore}
                max={100}
                color={overallColor}
                size={140}
                suffix="/100"
                strokeWidth={12}
                textColor={dark ? '#ffffff' : '#111'}
                trackColor={dark ? '#333333' : '#e5e7eb'}
              />
              <div className="mt-3 text-center">
                <div
                  className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: `${overallColor}20`,
                    color: overallColor,
                    border: `2px solid ${overallColor}`,
                  }}
                >
                  {overallLabel}
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Estado del sitio</h3>
                <p className="text-gray-700 leading-relaxed">{statusText}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={18} className="text-green-600" />
                    <span className="text-xs font-semibold text-green-900">Fortalezas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {data.insights.strengths.length}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={18} className="text-orange-600" />
                    <span className="text-xs font-semibold text-orange-900">A mejorar</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {data.criticalIssues.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}