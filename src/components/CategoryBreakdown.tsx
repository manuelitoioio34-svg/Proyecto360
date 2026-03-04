// src/components/CategoryBreakdown.tsx

// Vista principal del diagnóstico, mostrando métricas clave y permitiendo navegar a detalles por categoría (Performance, Seguridad, etc)
import React, { useMemo } from "react"
import { Card, CardContent } from "../shared/ui/card"

import {
  tTitle as i18nTitle,
  tRich as i18nRich,
  tSavings as i18nSavings,
} from "../../microPagespeed/src/lib/lh-i18n-es"

type RawItem = {
  id?: string
  title?: string
  subtitle?: string
  description?: string
  recommendation?: string
  displayValue?: string
  savingsLabel?: string
  details?: any
  score?: number | null
  status?: "info" | "pass" | "warn" | "fail" | "na" | "manual" | string
}

type Props = { label: string; items: RawItem[] | any }

function pillColor(status?: string, score?: number | null) {
  if (status === "fail") return "#ef4444"
  if (status === "warn") return "#f59e0b"
  if (status === "pass") return "#22c55e"
  if (typeof score === "number") {
    const s = score <= 1 && score >= 0 ? Math.round(score * 100) : score
    if (s >= 90) return "#22c55e"
    if (s >= 50) return "#f59e0b"
    return "#ef4444"
  }
  return "#94a3b8"
}
// TODO: agregar sección de recomendaciones generales (no solo por categoría) y/o insights destacados  
export default function CategoryBreakdown({ label, items }: Props) {
  const list = useMemo(() => {
    const arr: RawItem[] = Array.isArray(items) ? items : []
    return arr.map((a, i) => {
      const title = i18nTitle(a.title ?? a.id ?? "Hallazgo") || (a.title ?? a.id ?? "")
      const subtitle = i18nTitle(a.subtitle || "") || a.subtitle || ""
      const description = i18nRich(a.description ?? a.recommendation ?? "")
      const savings =
        i18nSavings(a.savingsLabel || a.displayValue || "") ||
        a.savingsLabel || a.displayValue || ""
      return {
        key: a.id || `i-${i}`,
        title, subtitle, description, savings,
        status: a.status,
        score: typeof a.score === "number" ? a.score : null,
      }
    })
  }, [items])

  // Si no hay items, no mostrar nada
  return (
    <Card className="mt-3">
      <CardContent>
        <h3 className="section-title mb-4">{label}</h3>
        <div className="diagnostico-grid grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">  
          {list.map((it) => (
            <div
              key={it.key}
              className="item relative rounded-xl border border-[#e5e7eb] p-4 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <span
                style={{ position: "absolute", right: 12, top: 12, width: 10, height: 10, borderRadius: "999px", background: pillColor(it.status, it.score) }}
                title={String(it.status || "")}
                aria-label={String(it.status || "")}
              />
              <div className="font-semibold text-sm text-[#222222]">{it.title}</div>
              {it.subtitle ? (
                <div className="text-xs text-[#646464] mt-0.5 leading-tight">{it.subtitle}</div>
              ) : null}
              <div className="desc text-[13px] text-[#383838] mt-2.5">
                {typeof it.description === "string" ? <span>{it.description}</span> : it.description}
              </div>
              {it.savings ? (
                <div className="text-xs font-semibold text-[#222222] mt-3">{it.savings}</div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}