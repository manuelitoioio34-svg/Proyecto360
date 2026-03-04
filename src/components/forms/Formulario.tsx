// src/components/forms/Formulario.tsx
// Flujo de nueva auditoría: solo URL → diagnóstico general

import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/card';
import { useAuth } from '../auth/AuthContext';
import { type FormData, type FormErrors } from './formularioTypes';
import { FormStepUrl } from './FormStepUrl';

export default function Formulario() {
    const [formData, setFormData] = useState<FormData>({ url: '' });
    const [errors, setErrors] = useState<FormErrors>({});

    const navigate = useNavigate();
    const { user } = useAuth();
    const isCliente = user?.role === 'cliente';

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value } as FormData));
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: '' } as FormErrors));
        }
    };

    const handleNext = () => {
        if (!formData.url) { setErrors({ url: 'Ingresa una URL válida' }); return; }
        try { new URL(formData.url); }
        catch { setErrors({ url: 'URL inválida' }); return; }
        setErrors({});
        navigate('/dashboard?url=' + encodeURIComponent(formData.url.trim()));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-2xl"
            >
                <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
                    <CardHeader className="text-center pb-8 pt-8 bg-gradient-to-r from-[#919191] to-black text-white">
                        <div className="mx-auto mb-4 flex flex-col items-center gap-2">
                            <img src="/LogoChoucair.png" alt="Choucair" className="h-14 w-auto" />
                            <span className="text-[9px] tracking-[0.25em] text-gray-200 font-medium">
                                BUSINESS CENTRIC TESTING
                            </span>
                        </div>
                        <CardTitle className="text-2xl font-bold mb-2">
                            {isCliente
                                ? `Bienvenidos a Visión web 360°${user?.name ? `, ${user.name}` : ''}`
                                : 'Visión web 360°'}
                        </CardTitle>
                        <CardDescription className="text-gray-200">
                            Ingresa la URL que deseas analizar
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8">
                        <FormStepUrl
                            direction={0}
                            url={formData.url}
                            error={errors.url}
                            onChange={handleInputChange}
                            onNext={handleNext}
                        />
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
