// src/components/forms/formularioTypes.ts
// Tipos compartidos del formulario de auditoria

export type FormData   = { url: string };
export type FormErrors = Partial<Record<'url' | 'submit', string>>;
export type ApiResponse = { _id?: string; error?: string; [k: string]: unknown };

/** Variantes de animacion de slide (usadas en FormStepUrl) */
export const slideVariants = {
    enter:  (direction: number) => ({ x: direction > 0 ?  300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (direction: number) => ({ x: direction < 0 ?  300 : -300, opacity: 0 }),
} as const;
