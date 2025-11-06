// /app/[locale]/(app)/comunicacio/marketing/_hooks/useAICampaignWizard.ts (FITXER COMPLET I CORREGIT)
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generateStrategiesAction, draftContentAction, saveCampaignAction } from "../actions";
import { type UsageCheckResult } from "@/lib/subscription/subscription"; // ✅ 1. Importem el tipus

// Tipus per a les estratègies
interface Strategy {
    name: string;
    type: string;
    target_audience: string;
    description: string;
    content?: string;
}

// Propietats que rep el hook
interface UseAICampaignWizardProps {
    onCampaignCreated: () => void;
    onClose: () => void;
    t: (key: string) => string;
    // ✅ 2. Afegim les props que falten
    campaignLimitStatus: UsageCheckResult;
    aiActionsLimitStatus: UsageCheckResult;
}

export function useAICampaignWizard({ 
    onCampaignCreated, 
    onClose, 
    t,
    campaignLimitStatus, // ✅ 3. Rebem les props
    aiActionsLimitStatus
}: UseAICampaignWizardProps) {
    const [step, setStep] = useState(1);
    const [goal, setGoal] = useState("");
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [isPending, startTransition] = useTransition();
    const [processingIndex, setProcessingIndex] = useState<number | null>(null);

    const resetWizard = () => {
        setStep(1);
        setGoal("");
        setStrategies([]);
        setSelectedStrategy(null);
        setProcessingIndex(null);
    };

    const handleGenerateStrategies = () => {
        if (!goal.trim()) return;
        
        // ✅ 4. Comprovació de límit d'IA (client-side)
        if (!aiActionsLimitStatus.allowed) {
            toast.error(t('toastErrorAI'), { description: aiActionsLimitStatus.error });
            return;
        }

        startTransition(async () => {
            const { data, error } = await generateStrategiesAction(goal);
            if (error) {
                toast.error(t('toastErrorAI'), { description: error });
            } else {
                setStrategies(data || []);
                setStep(2);
            }
        });
    };

    const handleDraftContent = (strategy: Strategy, index: number) => {
        setProcessingIndex(index);

        // ✅ 5. Comprovació de límit d'IA (client-side)
        if (!aiActionsLimitStatus.allowed) {
            toast.error(t('toastErrorAI'), { description: aiActionsLimitStatus.error });
            setProcessingIndex(null);
            return;
        }

        startTransition(async () => {
            const { data, error } = await draftContentAction(goal, strategy);
            if (error) {
                toast.error(t('toastErrorAI'), { description: error });
            } else {
                setSelectedStrategy({ ...strategy, content: data || "" });
                setStep(3);
            }
            setProcessingIndex(null);
        });
    };

    const handleSaveCampaign = () => {
        if (!selectedStrategy) return;

        // ✅ 6. Comprovació de límit de CAMPANYES (client-side)
        if (!campaignLimitStatus.allowed) {
            toast.error(t('toastErrorSave'), { description: campaignLimitStatus.error });
            return;
        }

        startTransition(async () => {
            const { error } = await saveCampaignAction(selectedStrategy, goal);
            if (error) {
                toast.error(t('toastErrorSave'), { description: t('toastErrorSaveDescription') });
            } else {
                toast.success(t('toastSuccessSave'), { description: t('toastSuccessSaveDescription') });
                onCampaignCreated();
                onClose();
                resetWizard();
            }
        });
    };

    return {
        step,
        goal,
        strategies,
        selectedStrategy,
        isPending,
        processingIndex,
        setStep,
        setGoal,
        setSelectedStrategy,
        resetWizard,
        handleGenerateStrategies,
        handleDraftContent,
        handleSaveCampaign
    };
}