// app/[locale]/(app)/dashboard/_hooks/useDashboardTasks.ts
import { useCallback, useTransition, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Task } from '@/types/crm';
import { useTranslations } from 'next-intl';

export function useDashboardTasks(initialTasks: Task[]) {
  const t = useTranslations('DashboardClient');
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const toggleTask = useCallback((taskId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const previous = [...tasks];
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
      const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
      if (error) {
        toast.error(t('toast.errorTitle'), { description: t('taskUpdateError') });
        setTasks(previous);
      }
    });
  }, [tasks, supabase, t]);

  return { tasks, toggleTask, isPending };
}
