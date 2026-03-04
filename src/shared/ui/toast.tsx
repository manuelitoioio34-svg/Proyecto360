import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../lib/utils'

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

// ─── Config visual por variante (colores Choucair) ──────────────────────────

const TOAST_STYLES: Record<ToastVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg:     'bg-[#f2ffe0]',
    border: 'border-[#93D500]',
    text:   'text-[#3a5000]',
    icon:   <CheckCircle size={18} className="text-[#93D500] shrink-0" />,
  },
  error: {
    bg:     'bg-[#fff0f2]',
    border: 'border-[#EA0029]',
    text:   'text-[#7a0015]',
    icon:   <XCircle size={18} className="text-[#EA0029] shrink-0" />,
  },
  info: {
    bg:     'bg-[#e8f4ff]',
    border: 'border-[#0075C9]',
    text:   'text-[#003d6b]',
    icon:   <Info size={18} className="text-[#0075C9] shrink-0" />,
  },
  warning: {
    bg:     'bg-[#fff6ee]',
    border: 'border-[#E47E3D]',
    text:   'text-[#7a3a00]',
    icon:   <AlertTriangle size={18} className="text-[#E47E3D] shrink-0" />,
  },
}

// ─── Componente individual de Toast ────────────────────────────────────────

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: string) => void }) {
  const styles = TOAST_STYLES[item.variant]
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 w-[360px] max-w-[calc(100vw-32px)]',
        'border rounded-lg px-4 py-3 shadow-lg',
        'animate-in slide-in-from-right-4 fade-in duration-200',
        styles.bg,
        styles.border,
        styles.text,
      )}
    >
      {styles.icon}
      <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={() => onClose(item.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <X size={15} />
      </button>
    </div>
  )
}

// ─── Contexto ───────────────────────────────────────────────────────────────

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info', duration = 4000) => {
    const id = `toast-${++counter.current}`
    setToasts((prev) => [...prev, { id, message, variant, duration }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal de toasts — esquina inferior derecha */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-3 pointer-events-none"
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} onClose={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx.toast
}
