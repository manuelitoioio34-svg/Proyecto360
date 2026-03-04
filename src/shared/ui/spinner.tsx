import { cn } from '../lib/utils'

interface SpinnerProps {
  /** Tamaño en píxeles. Default: 24 */
  size?: number
  /** Clases adicionales para el contenedor */
  className?: string
  /** Texto para lectores de pantalla */
  label?: string
}

/**
 * Spinner de carga — color primario Choucair (#93D500), rotación infinita.
 * Cumple WCAG: tiene aria-label y role="status".
 */
export function Spinner({ size = 24, className, label = 'Cargando…' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ animation: 'choucair-spin 0.8s linear infinite' }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#E0E0E0"
          strokeWidth="3"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="#93D500"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <style>{`
        @keyframes choucair-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  )
}
