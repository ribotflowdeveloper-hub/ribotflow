"use client";

import React, { useState, useTransition, FC, ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input, type InputProps } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, User, Building, Phone, Briefcase, ArrowRight, ArrowLeft, Globe, FileText } from 'lucide-react';
import type { DetailedAddress } from '@/types/DetailedAddress';
import { useTranslations } from 'next-intl';
import { AddressSearch } from '@/app/[locale]/_components/AddressSearch';
import { submitOnboardingAction } from '../actions';
import { createClient } from '@/lib/supabase/client';

const InputWithIcon: FC<InputProps & { icon: ElementType }> = ({ icon: Icon, ...props }) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input className="pl-10" {...props} />
    </div>
);

export function OnboardingClient({ initialFullName }: { initialFullName: string }) {
    const t = useTranslations('OnboardingPage');
    const router = useRouter();
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
        full_name: initialFullName,
        company_name: '',
        tax_id: '',
        website: '',
        summary: '',
        sector: '',
        servicesInput: '',
        phone: '',
        address: null as DetailedAddress | null,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddressSelect = (address: DetailedAddress) => {
        setFormData(prev => ({ ...prev, address }));
    };
    
    const validateStep = (currentStep: number): boolean => {
        switch (currentStep) {
            case 1: return !!formData.full_name && !!formData.company_name;
            case 2: return !!formData.address;
            case 3: return !!formData.servicesInput;
            default: return false;
        }
    };

    const handleNextStep = () => {
        if (validateStep(step)) {
            setStep(s => Math.min(3, s + 1));
        } else {
            toast.error(t('toastErrorValidation'));
        }
    };

    const handleSubmit = () => {
        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            toast.error(t('toastErrorValidationComplete'));
            return;
        }

        startTransition(async () => {
            if (!formData.address) {
                toast.error("L'adreça és obligatòria");
                return;
            }

            const finalDataForAction = {
                full_name: formData.full_name,
                company_name: formData.company_name,
                tax_id: formData.tax_id,
                website: formData.website,
                summary: formData.summary,
                sector: formData.sector,
                services: formData.servicesInput.split(',').map(s => s.trim()).filter(Boolean),
                phone: formData.phone,
                street: formData.address.street,
                city: formData.address.city,
                postal_code: formData.address.postcode,
                region: formData.address.region,
                country: formData.address.country,
                latitude: formData.address.latitude ?? undefined,
                longitude: formData.address.longitude ?? undefined,
            };
            
            const result = await submitOnboardingAction(finalDataForAction);
            
            if (result?.success === false) {
                toast.error("Hi ha hagut un error", { description: result.message });
            } else {
                toast.success("Benvingut/da!", { description: "El teu compte està a punt."});
                await supabase.auth.refreshSession();
                router.push('/dashboard');
            }
        });
    };

    const totalSteps = 3;
    const progress = (step / totalSteps) * 100;

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
            <div className="w-full max-w-2xl glass-card p-8 md:p-12 shadow-2xl space-y-6">
                <Progress value={progress} className="w-full" />
                <div className="text-center">
                    <p className="font-semibold text-primary mb-2">{t('step', { current: step, total: totalSteps })}</p>
                    <AnimatePresence mode="wait">
                        <motion.h1 key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-3xl font-bold">
                            {step === 1 && t('step1.title')}
                            {step === 2 && t('step2.title')}
                            {step === 3 && t('step3.title')}
                        </motion.h1>
                    </AnimatePresence>
                </div>

                <div className="min-h-[250px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <InputWithIcon icon={User} name="full_name" placeholder="El teu nom i cognoms" value={formData.full_name} onChange={handleInputChange} required />
                                <InputWithIcon icon={Building} name="company_name" placeholder="Nom de la teva empresa o marca" value={formData.company_name} onChange={handleInputChange} required />
                                <InputWithIcon icon={FileText} name="tax_id" placeholder="NIF/CIF (opcional)" value={formData.tax_id} onChange={handleInputChange} />
                            </motion.div>
                        )}
                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <AddressSearch onAddressSelect={handleAddressSelect} />
                                {formData.address && (
                                    <div className="pt-4 text-sm text-muted-foreground border-t mt-4">
                                        <p><strong>{t('step2.streetLabel')}:</strong> {formData.address.street}</p>
                                        <p><strong>{t('step2.cityLabel')}:</strong> {formData.address.city}</p>
                                        <p><strong>{t('step2.postcodeLabel')}:</strong> {formData.address.postcode}</p>
                                        <p><strong>{t('step2.regionLabel')}:</strong> {formData.address.region}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <InputWithIcon icon={Phone} name="phone" type="tel" placeholder="Telèfon de contacte" value={formData.phone} onChange={handleInputChange} />
                                <InputWithIcon icon={Globe} name="website" placeholder="Pàgina web (opcional)" value={formData.website} onChange={handleInputChange} />
                                <div>
                                    <InputWithIcon icon={Briefcase} name="servicesInput" placeholder="Serveis principals (separats per comes)" value={formData.servicesInput} onChange={handleInputChange} required />
                                    <p className="text-xs text-muted-foreground mt-1">Ex: Disseny web, SEO, Marketing digital</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-between items-center pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Enrere
                    </Button>
                    {step < totalSteps ? (
                        <Button type="button" onClick={handleNextStep}>Següent <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    ) : (
                        <Button type="button" onClick={handleSubmit} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : "Finalitzar"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}