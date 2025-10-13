// app/[locale]/(app)/dashboard/_hooks/useDashboardTasks.tsx
import { useCallback, useTransition, useState, useEffect } from 'react'; // ✅ 1. Importem useEffect
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TaskWithContact } from '@/types/dashboard/types'; // Importem el nostre tipus centralitzat 
import { deleteTask as deleteTaskAction } from '../actions'; // Importem l'acció de supressió 

export function useDashboardTasks (initialTasks: TaskWithContact[]) { // ✅ Utilitzem el nostre tipus
  const [tasks, setTasks] = useState(initialTasks); // ✅ L'estat ara és del tipus correcte
  const t = useTranslations('DashboardClient');
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // ✅ 2. AFEGIM AQUEST BLOC
  // Aquest 'useEffect' s'executarà cada cop que 'initialTasks' canviï.
  // Això passa després d'un 'router.refresh()', quan el servidor envia dades fresques.
  useEffect(() => {
    // Sincronitzem l'estat intern del hook amb les noves dades que arriben com a prop.
    setTasks(initialTasks);
  }, [initialTasks]);

  const toggleTask = useCallback((taskId: number, currentStatus: boolean) => {
    startTransition(async () => {
      // Optimistic Update
      const previousTasks = tasks;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
      
      const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
      
      if (error) {
        toast.error(t('toast.errorTitle'), { description: t('taskUpdateError') });
        setTasks(previousTasks); // Revertim en cas d'error
      }
    });
  }, [tasks, supabase, t]);

   // ✅ NOVA FUNCIÓ: Lògica per eliminar una tasca amb actualització optimista
  const deleteTask = useCallback((taskId: number) => {
    startTransition(async () => {
      const previousTasks = tasks;
      // Actualització optimista: eliminem la tasca de la UI a l'instant
      setTasks(prev => prev.filter(t => t.id !== taskId));

      const { error } = await deleteTaskAction(taskId);
      
      if (error) {
        toast.error(t('taskActions.toast.deleteErrorTitle'), { description: error.message });
        setTasks(previousTasks); // Si falla, revertim els canvis
      } else {
        toast.success(t('taskActions.toast.deleteSuccessTitle'));
      }
    });
  }, [tasks, t]);

  // ✅ Retornem la nova funció
  return { tasks, toggleTask, deleteTask, isPending };


}