import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { saveOpportunityAction } from '../actions.ts'; // Ajusta la ruta a les teves actions
import type { Opportunity } from '../app/[locale]/(app)/crm/pipeline/page';

interface HookProps {
    opportunityToEdit: Partial<Opportunity> | null;
    onSuccess: () => void;
    onOpenChange: (open: boolean) => void;
}

export function useOpportunityForm({ opportunityToEdit, onSuccess, onOpenChange }: HookProps) {
    const t = useTranslations('OpportunityDialog');
    const [isPending, startTransition] = useTransition();
    const [selectedContactId, setSelectedContactId] = useState('');
    const [closeDate, setCloseDate] = useState<Date | undefined>();

    useEffect(() => {
        setSelectedContactId(opportunityToEdit?.contact_id || '');
        setCloseDate(opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined);
    }, [opportunityToEdit]);

    const handleSubmit = (formData: FormData) => {
        if (opportunityToEdit?.id) formData.set('id', opportunityToEdit.id);
        if (selectedContactId) formData.set('contact_id', selectedContactId);
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