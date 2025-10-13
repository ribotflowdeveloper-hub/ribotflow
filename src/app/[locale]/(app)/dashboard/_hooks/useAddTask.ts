import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Tables } from '@/types/supabase';
import { addTask as addTaskAction } from '../actions';
import { NewTaskPayload } from '@/types/dashboard/types'; // ✅ Importem el nostre tipus centralitzat



export function useAddTask({ onTaskCreated }: { onTaskCreated?: () => void }) {
  // ✅ IMPORTANT: Assegura't que el 'useTranslations' apunta al lloc correcte.
  const t = useTranslations('DashboardClient.addTaskDialog');
  const [isPending, startTransition] = useTransition();
  const [selectedContact, setSelectedContact] = useState<Tables<'contacts'> | null>(null);

  const addTask = (taskData: Omit<NewTaskPayload, 'contact_id'>) => {
    startTransition(async () => {
      const payload: NewTaskPayload = {
        ...taskData,
        contact_id: selectedContact?.id ?? null,
      };
      
      const result = await addTaskAction(payload);
      
      if (result.error) {
        // Mostrem l'error des del hook
        toast.error(t('toast.errorTitle'), { description: result.error.message });
      } else {
        // ✅ CORRECCIÓ: Mostrem l'èxit des del hook amb la clau correcta.
        toast.success(t('toast.successTitle'));
        onTaskCreated?.(); // Cridem al callback per a que el client faci el router.refresh()
      }
    });
  };

  return { addTask, isPending, selectedContact, setSelectedContact };
}