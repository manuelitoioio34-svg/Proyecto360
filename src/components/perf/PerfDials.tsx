// ——— src/components/perf/PerfDials.tsx ———

// PerfDial (dial multi-segmento de performance) y CategoryDial (acc/bp/seo)
import React from 'react';
import CircularGauge from '../common/CircularGauge';
import { gaugeColor, softTint, MetricId } from './diagUtils';

// ======= Types =======
export type DialSeg = { id: MetricId; label: string; value: number | null };

// ======= PerfDial =======
export function PerfDial({
  score,
  segments,
  size = 140,
}: {
  score: number | null;
  segments: DialSeg[];
  size?: number;
}) {
  const W = size + 28;
  const H = size + 28;
  const cx = W / 2;
  const cy = H / 2 + 2;

  const strokeW = Math.max(8, Math.round(size * 0.083));
  const segR = size * 0.42;
  const innerR = size * 0.42;
  const numFont = Math.round(size * 0.285);
  const trackColor = '#e5e7eb';
  const numberColor = '#111827';

  const makeArc = (r: number, startDeg: number, endDeg: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const s = toRad(startDeg);
    const e = toRad(endDeg);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    const sweep = endDeg > startDeg ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
  };

  const layout: Record<string, [number, number, number]> = {
    si:  [-110, -70, -90],
    fcp: [-40,  0,   -20],
    lcp: [20,   60,  40],
    cls: [140,  200, 170],
    tbt: [210,  250, 230],
  };
  const segs = segments.filter((s) => layout[s.id]);
  const innerFill = softTint('performance', typeof score === 'number' ? score : null);

  return (
    <div className="w-full grid place-items-center">
      <svg width={W} height={H}>
        <circle cx={cx} cy={cy} r={segR} fill="none" stroke={trackColor} strokeWidth={strokeW} />
        {segs.map((s) => {
          const [a1, a2, la] = layout[s.id];
          const col = gaugeColor(s.id, s.value);
          return (
            <g key={s.id}>
              <path
                d={makeArc(segR, a1, a2)}
                stroke={col}
                strokeWidth={strokeW}
                fill="none"
                strokeLinecap="round"
              />
              <text
                x={cx + (segR + strokeW * 0.9) * Math.cos((la * Math.PI) / 180)}
                y={cy + (segR + strokeW * 0.9) * Math.sin((la * Math.PI) / 180)}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: Math.round(size * 0.083),
                  fill: '#111827',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                }}
              >
                {s.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={innerR} fill={innerFill} />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          style={{
            fontSize: numFont,
            fontWeight: 800,
            fill: numberColor,
            fontFamily: 'inherit',
            letterSpacing: '0.2px',
          }}
        >
          {typeof score === 'number' ? score : '—'}
        </text>
      </svg>
    </div>
  );
}

// ======= CategoryDial =======
export function CategoryDial({
  metricId,
  value,
  size = 120,
  strokeWidth = 12,
}: {
  metricId: MetricId;
  value: number | null;
  size?: number;
  strokeWidth?: number;
}) {
  const safe = typeof value === 'number' ? value : 0;
  const tint = softTint(metricId, value);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <CircularGauge
        value={safe}
        max={100}
        color={gaugeColor(metricId, value)}
        size={size}
        strokeWidth={strokeWidth}
        decimals={0}
        suffix=""
        textColor="#111827"
        trackColor="#e5e7eb"
        showValue={true}
        centerFill={tint}
        centerRadiusPct={0.98}
      />
    </div>
  );
}
