// src/components/security/SecuritySectionDivider.tsx
import React from 'react';
import { Info } from 'lucide-react';

export const Caret = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`transition-transform ${open ? 'rotate-180' : 'rotate-0'}`}
    aria-hidden
  >
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function SectionDivider({
  label,
  info,
}: {
  label: string;
  info?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const id = `info-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="w-full my-8" role="region" aria-label={label}>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-200 shadow-sm">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-700 select-none">
            {label}
          </div>
          {info && (
            <button
              type="button"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 hover:scale-105 transition-all duration-200 shadow-sm"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={id}
              title="¿Qué es esto?"
            >
              <Info size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>
      {info && open && (
        <div
          id={id}
          className="mt-4 text-sm text-slate-700 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-4 shadow-sm animate-in slide-in-from-top-2 duration-300"
        >
          {info}
        </div>
      )}
    </div>
  );
}
