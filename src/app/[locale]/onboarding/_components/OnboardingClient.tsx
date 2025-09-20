"use client";

import React, { useState, useTransition, FC, ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input, type InputProps } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, User, Building, Phone, Briefcase,  ArrowRight, ArrowLeft } from 'lucide-react';
import type { DetailedAddress } from '@/types/DetailedAddress';
import { useTranslations } from 'next-intl';
import { AddressSearch } from '@/app/[locale]/_components/AddressSearch';

// Component auxiliar per a inputs amb icona
const InputWithIcon: FC<InputProps & { icon: ElementType }> = ({ icon: Icon, ...props }) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input className="pl-10" {...props} />
    </div>
);

/**
 * @summary Component principal i interactiu de la pàgina d'Onboarding, organitzat en passos.
 */
export function OnboardingClient({ initialFullName }: { initialFullName: string }) {
  const t = useTranslations('OnboardingPage');
  const supabase = createClient();
  const router = useRouter();
  
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);

  // Unifiquem totes les dades del formulari en un sol objecte d'estat.
  const [profileData, setProfileData] = useState({
    fullName: initialFullName,
    companyName: '',
    summary: '',
    servicesInput: '',
    companyPhone: '',
    address: null as DetailedAddress | null,
  });

  /**
   * @summary Gestor de canvis genèric per a la majoria d'inputs.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * @summary Callback que s'activa quan l'usuari selecciona una adreça verificada.
   */
  const handleAddressSelect = (address: DetailedAddress) => {
    setProfileData(prev => ({ ...prev, address }));
  };
  
  /**
   * @summary Valida si els camps obligatoris del pas actual estan plens.
   */
  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return !!profileData.fullName && !!profileData.companyName;
      case 2:
        return !!profileData.address;
      case 3:
        return !!profileData.servicesInput;
      default:
        return false;
    }
  };

  /**
   * @summary Avança al següent pas si la validació és correcta.
   */
  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(3, s + 1));
    } else {
      toast.error(t('toastErrorValidation'));
    }
  };

  /**
   * @summary Envia el formulari final a la base de dades.
   */
  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        toast.error(t('toastErrorValidation'));
        return;
    }

    startTransition(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error(t('toastErrorUser'));
        if (!profileData.address) throw new Error("L'adreça és obligatòria");

        // Construïm l'objecte final per enviar a l'Edge Function.
        // ✅ CORRECCIÓ: Assegurem que 'region' i 'country' s'inclouen a les dades finals.
        const finalProfileData = {
          full_name: profileData.fullName,
          company_name: profileData.companyName,
          summary: profileData.summary,
          company_phone: profileData.companyPhone,
          services: profileData.servicesInput.split(',').map(s => s.trim()).filter(Boolean),
          // Dades de l'adreça
          street: profileData.address.street,
          city: profileData.address.city,
          postal_code: profileData.address.postcode,
          region: profileData.address.region,     // Camp que faltava
          country: profileData.address.country,   // Camp que faltava
          latitude: profileData.address.latitude,
          longitude: profileData.address.longitude,
          onboarding_completed: true,
        };
        
        const { error } = await supabase.functions.invoke('submit-onboarding', {
          body: { profileData: finalProfileData, userId: user.id },
        });
        
        if (error) throw error;
        
        toast.success(t('toastSuccessTitle'), { description: t('toastSuccessDescription') });
        router.refresh();
      
      } catch (error) {
        toast.error(t('toastErrorTitle'), { description: (error as Error).message });
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
                      <InputWithIcon icon={User} name="fullName" placeholder={t('step1.namePlaceholder')} value={profileData.fullName} onChange={handleInputChange} required />
                      <InputWithIcon icon={Building} name="companyName" placeholder={t('step1.companyPlaceholder')} value={profileData.companyName} onChange={handleInputChange} required />
                      <Textarea name="summary" value={profileData.summary} onChange={handleInputChange} placeholder={t('step1.summaryPlaceholder')} />
                  </motion.div>
              )}
              {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <AddressSearch onAddressSelect={handleAddressSelect} />
                      {profileData.address && (
                          <div className="pt-4 text-sm text-muted-foreground border-t mt-4">
                              <p><strong>{t('step2.streetLabel')}:</strong> {profileData.address.street}</p>
                              <p><strong>{t('step2.cityLabel')}:</strong> {profileData.address.city}</p>
                              <p><strong>{t('step2.postcodeLabel')}:</strong> {profileData.address.postcode}</p>
                              <p><strong>{t('step2.regionLabel')}:</strong> {profileData.address.region}</p>
                          </div>
                      )}
                  </motion.div>
              )}
              {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                      <InputWithIcon icon={Phone} name="companyPhone" type="tel" placeholder={t('step3.phonePlaceholder')} value={profileData.companyPhone} onChange={handleInputChange} />
                      <div>
                          <InputWithIcon icon={Briefcase} name="servicesInput" placeholder={t('step3.servicesPlaceholder')} value={profileData.servicesInput} onChange={handleInputChange} required />
                          <p className="text-xs text-muted-foreground mt-1">{t('step3.servicesExample')}</p>
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center pt-6 border-t">
            <Button variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('backButton')}
            </Button>
            {step < totalSteps ? (
                <Button onClick={handleNextStep}>
                    {t('nextButton')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            ) : (
                <Button onClick={handleSubmit} disabled={isPending} className="bg-brand-green text-black hover:bg-brand-green/90">
                    {isPending ? <Loader2 className="animate-spin" /> : t('finishButton')}
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}