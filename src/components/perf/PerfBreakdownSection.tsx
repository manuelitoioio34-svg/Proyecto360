// ——— src/components/perf/PerfBreakdownSection.tsx ———

// Sección de desglose de métricas individuales dentro del diagnóstico de Performance
import React from 'react';
import { Info } from 'lucide-react';
import CircularGauge from '../common/CircularGauge';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { gaugeColor, softBg, MetricId } from './diagUtils';

// ======= Texts =======
const perfMetricLong: Record<string, React.ReactNode> = {
  fcp: (
    <>
      Indica cuándo se muestra el primer contenido. Umbrales: Bueno &lt; 1.8s, Mejorable 1.8–3.0s, Deficiente &gt; 3.0s.
      Optimiza CSS crítico y reduce bloqueos en el render.
    </>
  ),
  lcp: (
    <>
      Marca cuándo aparece el elemento con contenido más grande (hero, imagen principal, etc.). Umbrales: Bueno &lt; 2.5s,
      Mejorable 2.5–4.0s, Deficiente &gt; 4.0s. Prioriza recursos críticos e imágenes optimizadas.
    </>
  ),
  tbt: (
    <>
      Suma del tiempo en el que el hilo principal estuvo bloqueado durante la carga. Umbrales: Bueno &lt; 0.2s,
      Mejorable 0.2–0.6s, Deficiente &gt; 0.6s. Divide bundles y evita trabajo JS costoso.
    </>
  ),
  si: (
    <>
      Velocidad percibida del render. Umbrales: Bueno &lt; 3.4s, Mejorable 3.4–5.8s, Deficiente &gt; 5.8s.
      Mantén el DOM ligero y usa lazy-load.
    </>
  ),
  ttfb: (
    <>
      Latencia del servidor hasta el primer byte. Umbrales: Bueno &lt; 0.8s, Mejorable 0.8–1.8s, Deficiente &gt; 1.8s.
      Mejora caché, CDN y rendimiento backend.
    </>
  ),
  cls: (
    <>
      Estabilidad visual. Umbrales: Bueno &lt; 0.1, Mejorable 0.1–0.25, Deficiente &gt; 0.25.
      Reserva espacio para imágenes y evita insertar contenido por encima.
    </>
  ),
};

// ======= PerfBreakdownGrid =======
export function PerfBreakdownGrid({
  items,
}: {
  items: Array<{ id: MetricId; label: string; value: number | null }>;
}) {
  if (!items.length) return null;
  const [openInfos, setOpenInfos] = React.useState<Record<string, boolean>>({});

  return (
    <Card className="mt-4 w-full">
      <CardHeader>
        <CardTitle>Desglose de Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="diagnostico-grid">
          {items.map((m) => {
            const isTime = m.id !== 'performance' && m.id !== 'cls';
            const isCLS = m.id === 'cls';
            const v = m.value;
            const openInfo = !!openInfos[m.id];
            return (
              <div key={m.id} className="item" style={{ background: softBg(m.id, v) }}>
                <div className="flex items-center justify-between px-3">
                  <strong className="text-[13px]">{m.label}</strong>
                  <button
                    type="button"
                    className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition"
                    onClick={(e) => { e.stopPropagation(); setOpenInfos((s) => ({ ...s, [m.id]: !s[m.id] })); }}
                    aria-expanded={openInfo}
                    title="¿Qué es esto?"
                  >
                    <Info size={14} strokeWidth={2.4} />
                  </button>
                </div>
                <div className="p-3 flex justify-center">
                  <CircularGauge
                    value={
                      v == null ? 0
                        : isTime ? Number(v.toFixed(1))
                          : isCLS ? Number((v ?? 0).toFixed(2))
                            : Number(v)
                    }
                    max={isTime ? undefined : isCLS ? undefined : 100}
                    color={v == null ? '#9ca3af' : gaugeColor(m.id, v)}
                    decimals={isTime ? 1 : isCLS ? 2 : 0}
                    suffix={isTime ? 's' : isCLS ? '' : ''}
                    size={120}
                  />
                </div>
                <p className="item-desc mb-0 px-3">
                  {v == null ? '—'
                    : isTime ? `${v.toFixed(1)}s`
                      : isCLS ? `${v.toFixed(2)}`
                        : `${v}`}
                </p>
                {openInfo && (
                  <div className="px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md mt-2">
                    {perfMetricLong[m.id] || 'Información no disponible.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ======= ScreenshotPreview =======
export function ScreenshotPreview({ src }: { src: string | null }) {
  const [open, setOpen] = React.useState(false);
  if (!src) return null;

  return (
    <Card className="mt-4 w-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Vista previa (captura)</CardTitle>
        <Button variant="outline" onClick={() => setOpen(true)}>Abrir</Button>
      </CardHeader>
      <CardContent>
        <img
          src={src}
          alt="Vista previa de la página"
          className="w-60 h-auto rounded-xl block shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
        />
        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-4 max-w-[90vw] max-h-[90vh] shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
            >
              <div className="flex justify-end mb-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
              </div>
              <img
                src={src}
                alt="Vista previa ampliada"
                className="max-w-[85vw] max-h-[80vh] rounded-xl block"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ======= getFinalScreenshot =======
import { ApiData } from '../../shared/types/api.js';

export function getFinalScreenshot(apiData: ApiData): string | null {
  const thumb =
    apiData?.raw?.lighthouseResult?.audits?.['final-screenshot']?.details?.data ||
    apiData?.lighthouseResult?.audits?.['final-screenshot']?.details?.data ||
    apiData?.raw?.audits?.['final-screenshot']?.details?.data ||
    apiData?.audits?.['final-screenshot']?.details?.data ||
    apiData?.raw?.lighthouseResult?.audits?.['screenshot-thumbnails']?.details?.items?.slice(-1)?.[0]?.data ||
    apiData?.lighthouseResult?.audits?.['screenshot-thumbnails']?.details?.items?.slice(-1)?.[0]?.data ||
    apiData?.raw?.audits?.['screenshot-thumbnails']?.details?.items?.slice(-1)?.[0]?.data ||
    apiData?.audits?.['screenshot-thumbnails']?.details?.items?.slice(-1)?.[0]?.data;

  return typeof thumb === 'string' && thumb.startsWith('data:') ? thumb : null;
}
