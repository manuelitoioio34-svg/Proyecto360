// src/components/common/EmailPdfBar.tsx
// Barra de exportación de informe a PDF (descarga local).
// Motor de captura: emailPdfGenerator.ts · Utilidades DOM: emailPdfUtils.ts
import React, { useState, type RefObject } from "react";
import { makePdfFromRef, type PdfAttachment } from "./emailPdfGenerator";

type Props = {
  captureRef: RefObject<HTMLElement | null>;
  url?: string;
  subject?: string;
  endpoint?: string;                 // default: "/api/audit/send-diagnostic"
  includePdf?: boolean;              // default: true
  email?: string;
  hideEmailInput?: boolean;          // default: true
  id?: string | null;
  context?: string;                  // p.ej., 'dashboard' | 'full-check' | 'performance' | 'security'
  extraBody?: any;                   // payload extra para el backend (e.g., overallScore, diagnostics)
  avoidSelectors?: string[];         // selectores extra para no cortar dentro (aÃ±ade a los por defecto)
  safeStopSelectors?: string[];      // selectores extra para proponer cortes seguros
  filenameBase?: string;
  marginPt?: number;                 // default: 24
  captureWidthPx?: number;           // si no pasas, se autodetecta
  extraWaitMs?: number;              // default: 150
  applyPdfClass?: boolean;           // default: true
  pdfClassName?: string;             // default: "pdf-root"
  exactVisual?: boolean;             // default: true -> captura WYSIWYG (sin estilos forzados)
};

export default function EmailPdfBar({
  captureRef,
  url = "",
  subject,
  endpoint = "/api/audit/send-diagnostic",
  includePdf = true,
  email = "",
  hideEmailInput = true,
  id = null,
  context,
  extraBody,
  avoidSelectors = [],
  safeStopSelectors = [],
  filenameBase,
  marginPt = 24,
  captureWidthPx,
  extraWaitMs = 300,
  applyPdfClass = true,
  pdfClassName = "pdf-root",
  exactVisual = true,
}: Props) {
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function downloadBase64Pdf(pdf: NonNullable<PdfAttachment>) {
    const byteCharacters = atob(pdf.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = pdf.filename || 'diagnostico.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  }

  async function handleSend() {
    setSentMsg(""); setErrorMsg(""); setSending(true);
    try {
      let pdf: PdfAttachment | null = null;
      if (includePdf) {
        pdf = await makePdfFromRef({
          captureRef, url, filenameBase, context,
          marginPt, captureWidthPx, extraWaitMs,
          applyPdfClass, pdfClassName, exactVisual,
          avoidSelectors, safeStopSelectors,
        });
        if (!pdf) throw new Error('No se pudo generar el PDF');
      }

      if (!pdf) throw new Error('No se pudo generar el PDF');
      downloadBase64Pdf(pdf);
      setSentMsg('PDF descargado correctamente');
    } catch (e: unknown) {
      setErrorMsg((e as Error)?.message || "Error al exportar el informe");
    } finally {
      setSending(false);
      setTimeout(() => setSentMsg(""), 5000);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        title="Exportar informe a PDF"
        style={{
          background: "#2563EB",
          color: "#fff",
          border: "none",
          padding: "12px 16px",
          borderRadius: 10,
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,.08)",
          fontWeight: 600,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          if (!sending) {
            e.currentTarget.style.background = "#1d4ed8";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          if (!sending) {
            e.currentTarget.style.background = "#2563EB";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,.08)";
          }
        }}
      >
        {sending ? "Exportando…" : "Exportar PDF"}
      </button>

      {errorMsg && <span className="text-[#EA0029] text-[0.95rem]">❌ {errorMsg}</span>}
      {sentMsg && <span className="text-[#9ED919] text-[0.95rem]">✅ {sentMsg}</span>}
    </div>
  );
}
