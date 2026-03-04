// ——— src/components/perf/CategoryBreakdownPanel.tsx ———

// Panel de desglose por categoría (Performance) dentro del diagnóstico de Performance
import React from 'react';
import CircularGauge from '../common/CircularGauge';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { gaugeColor, softBg, CatBreakItem } from './diagUtils';

export function CategoryBreakdown({
  label,
  items,
}: {
  label: string;
  items: CatBreakItem[];
}) {
  if (!items.length) return null;
  return (
    <Card className="mt-4 w-full">
      <CardHeader>
        <CardTitle>Desglose de {label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="diagnostico-grid">
          {items.map((it) => {
            const isNull = it.scorePct == null;
            return (
              <div
                key={it.id}
                className="item"
                style={{ background: softBg('performance', it.scorePct) }}
              >
                <h4
                  className="item-label"
                  title={typeof it.description === 'string' ? it.description : ''}
                >
                  {it.title}
                </h4>
                <CircularGauge
                  value={isNull ? 0 : it.scorePct!}
                  max={100}
                  color={isNull ? '#9ca3af' : gaugeColor('performance', it.scorePct)}
                  decimals={0}
                  suffix=""
                  size={120}
                />
                <p className="item-desc">
                  {isNull
                    ? '—'
                    : it.savingsLabel
                      ? `Ahorro: ${it.savingsLabel}`
                      : it.displayValue || '—'}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
