// src/components/forms/FormStepUrl.tsx
// Paso 0 del formulario: entrada de URL

import React, { type ChangeEvent } from 'react';
import { Globe, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '../../shared/ui/input';
import { Button } from '../../shared/ui/button';
import { slideVariants } from './formularioTypes';

interface FormStepUrlProps {
    direction: number;
    url: string;
    error?: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onNext: () => void;
}

export function FormStepUrl({ direction, url, error, onChange, onNext }: FormStepUrlProps) {
    return (
        <motion.div
            key="step-0"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-8"
        >
            <div className="text-center">
                <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                    <Globe className="w-10 h-10 text-green-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">URL del Sitio Web</h3>
                <p className="text-gray-600 text-sm">Comienza ingresando la dirección que quieres analizar</p>
            </div>

            <div className="space-y-3">
                <Input
                    id="url"
                    name="url"
                    type="url"
                    value={url}
                    onChange={onChange}
                    placeholder="https://ejemplo.com"
                    className="h-12 text-base border-2 rounded-lg pl-4 pr-4 focus:border-green-500 focus:ring-green-500"
                    autoFocus
                />
                {error && (
                    <p className="text-red-500 text-sm font-medium flex items-center gap-2">
                        <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">!</span>
                        {error}
                    </p>
                )}
            </div>

            <div className="flex justify-center pt-4">
                <Button
                    onClick={onNext}
                    disabled={!url}
                    className="h-12 px-10 text-base bg-[#222222] hover:bg-[#383838] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    Continuar
                    <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </motion.div>
    );
}
