import React from "react"
import DiagnosticoView from "../../components/DiagnosticoView"

/**
 * Página FSD: Detalle del diagnóstico.
 */
export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a1220] pt-2 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <DiagnosticoView />
      </div>
    </div>
  )
}
