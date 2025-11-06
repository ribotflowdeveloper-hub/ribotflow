import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
// ✅ 1. Importem la nova acció
import { saveOpportunityAction, deleteOpportunityAction } from '../actions';
import { type OpportunityWithContact } from '../_components/PipelineData';

interface HookProps {
  opportunityToEdit: Partial<OpportunityWithContact> | null;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useOpportunityForm({ opportunityToEdit, onSuccess, onOpenChange }: HookProps) {
  const t = useTranslations('OpportunityDialog');
  const [isPending, startTransition] = useTransition();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [closeDate, setCloseDate] = useState<Date | undefined>();

  useEffect(() => {
    setSelectedContactId(opportunityToEdit?.contact_id || null);
    setCloseDate(opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined);
  }, [opportunityToEdit]);

  const handleSubmit = (formData: FormData) => {
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

  // ✅ 2. NOVA FUNCIÓ D'ELIMINAR
  const handleDelete = () => {
    if (!opportunityToEdit?.id) {
      toast.error(t('toastErrorTitle'), { description: "No es pot eliminar una oportunitat sense ID." });
      return;
    }

    startTransition(async () => {
      const result = await deleteOpportunityAction(opportunityToEdit.id as number);
      if (result.error) {
        toast.error(t('toastDeleteErrorTitle'), { description: result.error.message });
      } else {
        toast.success(t('toastDeleteSuccessTitle'));
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
    handleDelete, // ✅ 3. Exportem la nova funció
  };
}