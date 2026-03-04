// src/shared/ui/access-banner.tsx
// Componentes reutilizables para banners de acceso denegado/limitado e información.

import React from "react";
import { Ban, Info } from "lucide-react";

interface AccessBannerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** 'amber' para acceso denegado/limitado, 'blue' para notas informativas */
  variant?: "amber" | "blue";
}

export function AccessBanner({ title, children, className = "", variant = "amber" }: AccessBannerProps) {
  const isAmber = variant === "amber";
  const containerCls = isAmber
    ? "bg-amber-50 border-amber-200 text-amber-800"
    : "bg-blue-50 border-blue-200 text-blue-800";
  const iconContainerCls = isAmber ? "bg-amber-100" : "bg-blue-100";

  return (
    <div className={`rounded-lg border p-4 ${containerCls} mb-6 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full ${iconContainerCls} flex items-center justify-center shrink-0`}>
          {isAmber ? <Ban size={16} /> : <Info size={16} />}
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-1">{title}</div>
          <div className="m-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface InfoNoteProps {
  children: React.ReactNode;
  className?: string;
}

/** Nota informativa compacta en azul, sin ícono prominente. */
export function InfoNote({ children, className = "" }: InfoNoteProps) {
  return (
    <div className={`rounded-lg border p-3 bg-blue-50 border-blue-200 text-blue-800 mb-6 ${className}`}>
      <div className="text-xs">{children}</div>
    </div>
  );
}

/** Código de permiso con formato mono. */
export function PermCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs bg-white/60 px-1 py-0.5 rounded border">
      {children}
    </code>
  );
}
