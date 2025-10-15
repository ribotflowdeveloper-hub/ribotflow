// /app/[locale]/(app)/crm/pipeline/_hooks/useOpportunityForm.ts (Refactoritzat)

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { saveOpportunityAction } from '../actions';
// ✅ Importem el tipus enriquit.
import { type OpportunityWithContact } from '../_components/PipelineData';

interface HookProps {
    opportunityToEdit: Partial<OpportunityWithContact> | null;
    onSuccess: () => void;
    onOpenChange: (open: boolean) => void;
}

export function useOpportunityForm({ opportunityToEdit, onSuccess, onOpenChange }: HookProps) {
    const t = useTranslations('OpportunityDialog');
    const [isPending, startTransition] = useTransition();
    // ✅ L'estat ara gestiona un número o null.
    const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
    const [closeDate, setCloseDate] = useState<Date | undefined>();

    useEffect(() => {
        setSelectedContactId(opportunityToEdit?.contact_id || null);
        setCloseDate(opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined);
    }, [opportunityToEdit]);

    const handleSubmit = (formData: FormData) => {
        // ✅ Si estem editant, afegim l'ID com a string (FormData només accepta strings).
        if (opportunityToEdit?.id) formData.set('id', opportunityToEdit.id.toString());
        if (selectedContactId) formData.set('contact_id', selectedContactId.toString());
        if (closeDate) formData.set('close_date', closeDate.toISOString());

        startTransition(async () => {
            const result = await saveOpportunityAction(formData);
            if (result.error) {
                toast.error(t('toastErrorTitle'), { description: result.error.message });
            } else {
                toast.success(t('toastSuccessTitle'), { description: t('toastSuccessDescription') });
                onSuccess();
                onOpenChange(false);
            }
        });
    };

    return {
        isPending,
        selectedContactId,
        setSelectedContactId,
        closeDate,
        setCloseDate,
        handleSubmit,
    };
}