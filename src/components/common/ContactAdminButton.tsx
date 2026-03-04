// src/components/common/ContactAdminButton.tsx

// Botón frontend-only para que el cliente solicite contacto con el administrador.
// Al hacer clic muestra un modal de confirmación: "Pronto te contactaremos".
import React, { useState } from 'react';
import { MessageCircle, X, CheckCircle2, Mail } from 'lucide-react';

interface ContactAdminButtonProps {
  /** Variante de presentación: 'drawer' = versión compacta para el navbar drawer */
  variant?: 'default' | 'drawer';
}

export default function ContactAdminButton({ variant = 'default' }: ContactAdminButtonProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    setSent(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => setSent(false), 300);
  };

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────── */}
      {variant === 'drawer' ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: '#e5e7eb' }}
        >
          <MessageCircle size={17} style={{ color: '#9ca3af' }} />
          Contactar administrador
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: '#0075C9', color: '#ffffff' }}
        >
          <MessageCircle size={15} />
          Contactar administrador
        </button>
      )}

      {/* ── Modal overlay ───────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ backgroundColor: '#0075C9' }}
            >
              <div className="flex items-center gap-2">
                <Mail size={18} color="#ffffff" />
                <span className="text-sm font-semibold text-white">
                  Solicitar más información
                </span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={16} color="#ffffff" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-6">
              {!sent ? (
                <>
                  <p className="text-sm text-gray-600 mb-1 leading-relaxed">
                    ¿Necesitas acceder a más funcionalidades o tienes dudas sobre tu diagnóstico?
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">
                    Haz clic en el botón y un administrador se pondrá en contacto contigo a la brevedad.
                  </p>
                  <button
                    onClick={handleSend}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ backgroundColor: '#0075C9', color: '#ffffff' }}
                  >
                    Enviar solicitud
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 size={48} style={{ color: '#93D500' }} />
                  <h3 className="text-base font-bold text-gray-800">
                    ¡Solicitud enviada!
                  </h3>
                  <p className="text-sm text-gray-500 text-center leading-relaxed">
                    Pronto te contactaremos para brindarte la información que necesitas.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-6 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
