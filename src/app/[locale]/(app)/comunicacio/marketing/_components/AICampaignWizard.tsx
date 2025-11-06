// /app/[locale]/(app)/comunicacio/marketing/_components/AICampaignWizard.tsx (FITXER COMPLET I CORREGIT)

"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from 'next-intl'; // ✅ 1. Importem useTranslations
import { Wand2,TriangleAlert } from "lucide-react"; // ✅ 2. Importem icones
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

import { useAICampaignWizard } from "../_hooks/useAICampaignWizard";
import { WizardStep1_Goal } from "./wizard/WizardStep1_Goal";
import { WizardStep2_SelectStrategy } from "./wizard/WizardStep2_SelectStrategy";
import { WizardStep3_Finalize } from "./wizard/WizardStep3_Finalize";
import { type UsageCheckResult } from "@/lib/subscription/subscription"; // ✅ 3. Importem el tipus de límit

interface AICampaignWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCampaignCreated: () => void;
    // ✅ 4. Afegim les props que falten (aquesta era la causa de l'error)
    campaignLimitStatus: UsageCheckResult;
    aiActionsLimitStatus: UsageCheckResult;
}

const WizardProgressBar = ({ step }: { step: number }) => (
    <div className="flex items-center pt-4">
        {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {s}
                    </div>
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 transition-all ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </React.Fragment>
        ))}
    </div>
);

export const AICampaignWizard: React.FC<AICampaignWizardProps> = ({ 
    open, 
    onOpenChange, 
    onCampaignCreated,
    campaignLimitStatus, // ✅ 5. Rebem les props
    aiActionsLimitStatus   // ✅ 5. Rebem les props
}) => {
    const t = useTranslations('AICampaignWizard');
    const t_billing = useTranslations('Billing'); // Per als missatges de límit

    const {
        step, goal, strategies, selectedStrategy, isPending, processingIndex,
        setStep, setGoal, setSelectedStrategy, resetWizard,
        handleGenerateStrategies, handleDraftContent, handleSaveCampaign
    } = useAICampaignWizard({
        onCampaignCreated,
        onClose: () => onOpenChange(false),
        t,
        // ✅ 6. Passem els límits al hook (el hook els necessitarà per als toasts)
        campaignLimitStatus,
        aiActionsLimitStatus
    });

    // ✅ 7. Calculem l'estat dels límits per a la UI
    const isCampaignLimitReached = !campaignLimitStatus.allowed;
    const isAILimitReached = !aiActionsLimitStatus.allowed;
    
    // El Wizard es bloqueja si s'ha assolit QUALSEVOL dels dos límits
    const isLimitReached = isCampaignLimitReached || isAILimitReached;
    
    // Determinem el missatge d'error correcte
    const limitError = isCampaignLimitReached 
      ? campaignLimitStatus.error 
      : (isAILimitReached ? aiActionsLimitStatus.error : t_billing('limitReachedDefault'));

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetWizard(); onOpenChange(isOpen); }}>
            <DialogContent className="max-w-2xl min-h-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Wand2 className="text-primary" /> {t('title')}
                    </DialogTitle>
                    <WizardProgressBar step={step} />
                </DialogHeader>

                {/* ✅ 8. ALARMA DE LÍMIT SUPERAT */}
                {isLimitReached && (
                  <div className="p-0">
                    <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900">
                      <TriangleAlert className="h-4 w-4 text-yellow-900" />
                      <AlertTitle className="font-semibold">
                        {t_billing('limitReachedTitle')}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {limitError}
                        <Button asChild variant="link" size="sm" className="px-1 h-auto py-0 text-yellow-900 font-semibold">
                          <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <WizardStep1_Goal
                            goal={goal}
                            setGoal={setGoal}
                            onGenerate={handleGenerateStrategies}
                            // ✅ 9. Bloquegem si s'ha assolit el límit
                            isPending={isPending || isLimitReached}
                            t={t}
                        />
                    )}

                    {step === 2 && (
                        <WizardStep2_SelectStrategy
                            strategies={strategies}
                            onSelect={handleDraftContent}
                            onBack={() => setStep(1)}
                            // ✅ 9. Bloquegem si s'ha assolit el límit
                            isPending={isPending || isLimitReached}
                            processingIndex={processingIndex}
                            t={t}
                        />
                    )}

                    {step === 3 && selectedStrategy && (
                        <WizardStep3_Finalize
                            strategy={selectedStrategy}
                            onStrategyChange={setSelectedStrategy}
                            onSave={handleSaveCampaign}
                            onBack={() => setStep(2)}
                            // ✅ 9. Bloquegem si s'ha assolit el límit
                            isPending={isPending || isLimitReached}
                            t={t}
                        />
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};