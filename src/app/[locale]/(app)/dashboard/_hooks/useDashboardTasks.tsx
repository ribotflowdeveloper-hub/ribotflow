// app/[locale]/(app)/dashboard/_hooks/useDashboardTasks.tsx
import { useCallback, useTransition, useState, useEffect } from 'react'; // ✅ 1. Importem useEffect
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TaskWithContact } from '@/types/dashboard/types'; // Importem el nostre tipus centralitzat 

export function useDashboardTasks (initialTasks: TaskWithContact[]) { // ✅ Utilitzem el nostre tipus
  const [tasks, setTasks] = useState(initialTasks); // ✅ L'estat ara és del tipus correcte
  const t = useTranslations('DashboardClient.agenda');
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

  return { tasks, toggleTask, isPending };
}