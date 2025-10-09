"use client";

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { DetailedAddress } from '@/types/shared/address';
import { submitOnboardingAction } from '../actions';

const initialFormData = {
    full_name: '',
    company_name: '',
    tax_id: '',
    website: '',
    phone: '',
    services: [] as string[],
    address: null as DetailedAddress | null,
    summary: '',
    sector: '',
};

export function useOnboardingForm(initialFullName: string) {
    const [formData, setFormData] = useState({ ...initialFormData, full_name: initialFullName });
    const [step, setStep] = useState(1);
    const [isPending, startTransition] = useTransition();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddressSelect = (address: DetailedAddress) => {
        setFormData(prev => ({ ...prev, address }));
    };

    const handleToggleService = (serviceName: string) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.includes(serviceName)
                ? prev.services.filter(s => s !== serviceName)
                : [...prev.services, serviceName]
        }));
    };

    const validateStep = (currentStep: number): boolean => {
        switch (currentStep) {
            case 1: return !!formData.full_name && !!formData.company_name;
            case 2: return !!formData.address;
            case 3: return formData.services.length > 0;
            default: return true;
        }
    };

    const goToNextStep = () => {
        if (validateStep(step)) setStep(s => Math.min(3, s + 1));
        else toast.error("Si us plau, completa els camps obligatoris.");
    };

    const goToPrevStep = () => setStep(s => Math.max(1, s - 1));

    const handleSubmit = () => {
        // 1. Validació dels passos (això ja ho tenies)
        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            toast.error("Falten camps per completar en alguns dels passos.");
            return;
        }

        // 2. ✅ AFEGIM LA COMPROVACIÓ DE SEGURETAT (LA GUARDA)
        // Aquesta línia és la clau. Si l'adreça és nul·la, mostrem un error i parem l'execució.
        if (!formData.address) {
            toast.error("L'adreça és obligatòria. Si us plau, selecciona'n una.");
            return;
        }

        startTransition(async () => {
            // 3. Ara TypeScript ja sap que 'formData.address' no pot ser 'null' aquí.
            const finalDataForAction = {
                full_name: formData.full_name,
                company_name: formData.company_name,
                tax_id: formData.tax_id,
                website: formData.website,
                summary: formData.summary,
                sector: formData.sector,
                services: formData.services,
                phone: formData.phone,
                street: formData.address!.street, // <-- Ara és segur accedir aquí
                city: formData.address!.city,
                postal_code: formData.address!.postcode,
                region: formData.address!.region,
                country: formData.address!.country,
                latitude: formData.address!.latitude ?? undefined,
                longitude: formData.address!.longitude ?? undefined,
            };

            const result = await submitOnboardingAction(finalDataForAction);

            if (result?.success === false) {
                toast.error(result.message || "Hi ha hagut un error desconegut.");
            }
        });
    };

    // ✅ Assegura't que l'objecte que retornes inclou TOTES aquestes funcions
    return {
        step,
        formData,
        isPending,
        handleInputChange,
        handleAddressSelect,
        handleToggleService,
        goToNextStep,
        goToPrevStep,
        handleSubmit, // <-- La funció que faltava!
    };
}