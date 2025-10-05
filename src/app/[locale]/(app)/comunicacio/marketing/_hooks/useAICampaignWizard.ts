// Ubicació: /app/(app)/comunicacio/marketing/_hooks/useAICampaignWizard.ts

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generateStrategiesAction, draftContentAction, saveCampaignAction } from "../actions";

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
}

export function useAICampaignWizard({ onCampaignCreated, onClose, t }: UseAICampaignWizardProps) {
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