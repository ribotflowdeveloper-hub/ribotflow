// Ubicació: /app/(app)/comunicacio/marketing/_components/AICampaignWizard.tsx

"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from 'next-intl';
import { Wand2 } from "lucide-react";

import { useAICampaignWizard } from "../_hooks/useAICampaignWizard";
import { WizardStep1_Goal } from "./wizard/WizardStep1_Goal";
import { WizardStep2_SelectStrategy } from "./wizard/WizardStep2_SelectStrategy";
import { WizardStep3_Finalize } from "./wizard/WizardStep3_Finalize";

interface AICampaignWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCampaignCreated: () => void;
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

export const AICampaignWizard: React.FC<AICampaignWizardProps> = ({ open, onOpenChange, onCampaignCreated }) => {
    const t = useTranslations('AICampaignWizard');
    const {
        step, goal, strategies, selectedStrategy, isPending, processingIndex,
        setStep, setGoal, setSelectedStrategy, resetWizard,
        handleGenerateStrategies, handleDraftContent, handleSaveCampaign
    } = useAICampaignWizard({
        onCampaignCreated,
        onClose: () => onOpenChange(false),
        t
    });

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetWizard(); onOpenChange(isOpen); }}>
            <DialogContent className="max-w-2xl min-h-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Wand2 className="text-primary" /> {t('title')}
                    </DialogTitle>
                    <WizardProgressBar step={step} />
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <WizardStep1_Goal
                            goal={goal}
                            setGoal={setGoal}
                            onGenerate={handleGenerateStrategies}
                            isPending={isPending}
                            t={t}
                        />
                    )}

                    {step === 2 && (
                        <WizardStep2_SelectStrategy
                            strategies={strategies}
                            onSelect={handleDraftContent}
                            onBack={() => setStep(1)}
                            isPending={isPending}
                            processingIndex={processingIndex}
                            t={t}
                        />
                    )}

                    {step === 3 && selectedStrategy && (
                        <WizardStep3_Finalize
                            strategy={selectedStrategy}
                            // ✅ CORRECCIÓ: Passem directament la funció 'setSelectedStrategy'
                            // que ve del hook 'useState'.
                            onStrategyChange={setSelectedStrategy}
                            onSave={handleSaveCampaign}
                            onBack={() => setStep(2)}
                            isPending={isPending}
                            t={t}
                        />
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};