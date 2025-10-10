import { useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  processOcrAction,
  uploadAttachmentAction,
  saveExpenseAction
} from '@/app/[locale]/(app)/finances/despeses/actions';
import type { ExpenseFormDataForAction } from '@/types/finances/index'; // ✅ millor importar directament de types

export function useExpenseActions() {
  const t = useTranslations('Expenses');
  const [isSaving, startSaveTransition] = useTransition();
  const [isProcessingOcr, startOcrTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();

  const processOcr = async (
    formData: FormData,
    onOcrSuccess: (data: Record<string, unknown>) => void
  ) => {
    startOcrTransition(async () => {
      const result = await processOcrAction(formData);
      if (!result.success) {
        toast.error(t('ocrError'), { description: result.message });
        return;
      }
      if (!result.data) {
        toast.error(t('extractError'));
        return;
      }
      onOcrSuccess(result.data);
      toast.success(t('dataExtracted'), { description: t('reviewForm') });
    });
  };

  const uploadAttachment = async (expenseId: string, formData: FormData) => {
    startUploadTransition(async () => {
      const result = await uploadAttachmentAction(expenseId, formData);
      if (!result.success) {
        toast.error(t('uploadErrorTitle'), { description: result.message });
      } else {
        toast.success(t('uploadSuccessTitle'), {
          description: t('uploadSuccessDescription'),
        });
        window.location.reload();
      }
    });
  };

  const saveExpense = async (
    data: ExpenseFormDataForAction,
    expenseId: string | null,
    onSaveSuccess: () => void
  ) => {
    startSaveTransition(async () => {
      const result = await saveExpenseAction(data, expenseId);
      if (!result.success) {
        toast.error(t('saveErrorTitle'), { description: result.message });
      } else {
        toast.success(t('saveSuccessTitle'), {
          description: t('saveSuccessDescription'),
        });
        onSaveSuccess();
        window.location.reload();
      }
    });
  };

  return {
    isSaving,
    isProcessingOcr,
    isUploading,
    processOcr,
    uploadAttachment,
    saveExpense,
  };
}
