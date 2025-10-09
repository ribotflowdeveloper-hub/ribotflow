"use client";

import { useOnboarding } from './OnboardingContext';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const { step, goToNextStep, goToPrevStep, handleSubmit, isPending } = useOnboarding();
    const t = useTranslations('OnboardingPage');
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
                    {children}
                </div>

                <div className="flex justify-between items-center pt-6 border-t">
                    <Button variant="ghost" onClick={goToPrevStep} disabled={step === 1 || isPending}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Enrere
                    </Button>
                    {step < totalSteps ? (
                        <Button onClick={goToNextStep} disabled={isPending}>
                            Següent <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : "Finalitzar"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}