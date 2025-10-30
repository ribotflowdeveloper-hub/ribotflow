// src/components/features/tasks/TaskDialogManager.tsx (COMPLET I CORREGIT)
'use client';

// ✅ PAS 1: Importem 'useMemo'
import { useState, useEffect, useMemo } from 'react';
import { TaskDetailView } from './TaskDetailView';
import { TaskFormView } from './TaskFormView';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tables, Json } from '@/types/supabase';
import { JSONContent } from '@tiptap/react';

// Tipus per a les entrades del log de temps
interface TimeTrackingLogEntry {
  status?: 'active' | 'inactive';
  action?: 'actiu' | 'inactiu';
  timestamp: string;
  user_id?: string;
}

// Tipus EnrichedTask
export type EnrichedTask = Tables<'tasks'> & {
  contacts: { id: number; nom: string } | null;
  profiles: {
    id?: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  departments: { id: number; name: string } | null;
  description_json?: JSONContent | string | null;
  checklist_progress?: { total: number; completed: number } | null;
  time_tracking_log: TimeTrackingLogEntry[] | null | Json;
  is_active?: boolean;
};

// Props del component
interface TaskDialogManagerProps {
    task: EnrichedTask | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Tables<'contacts'>[];
    initialDepartments: Tables<'departments'>[];
    teamMembers: { id: string; full_name: string | null }[];
    onTaskMutation: (options?: { closeDialog?: boolean }) => void;
    activeTeamId: string; 
    initialDate?: Date;
}

export function TaskDialogManager({
    task,
    open,
    onOpenChange,
    contacts,
    initialDepartments,
    teamMembers,
    onTaskMutation,
    initialDate, // Aquesta és la prop que ve del pare
}: TaskDialogManagerProps) {
    const [viewMode, setViewMode] = useState<'detail' | 'form'>(task ? 'detail' : 'form');

    // ✅ DEBUGGING (LOG 1)
    console.log('[TaskDialogManager] Props rebudes:', { 
        task: task, 
        open: open, 
        initialDate_prop: initialDate 
    });

    useEffect(() => {
        if (open) {
            const newMode = task ? 'detail' : 'form';
            setViewMode(newMode);
            // ✅ DEBUGGING (LOG 2)
            console.log(`[TaskDialogManager] useEffect ha canviat el mode a: ${newMode}`);
        }
    }, [open, task]);

    const handleClose = () => {
        onOpenChange(false);
    };

    // ✅ PAS 2: Embolcallem la lògica amb 'useMemo'
    // Això crea la data UN SOL COP i la desa, evitant el bucle de renders.
    // Només es recalcularà si 'initialDate' o 'task' canvien.
    const formInitialDate = useMemo(() => {
      // ✅ DEBUGGING (LOG 3) - Ara dins del 'useMemo'
      console.log("[TaskDialogManager] useMemo: Calculant 'formInitialDate'...");
      
      // 1. Si el pare ens dona una 'initialDate' (p.ex., clicant un dia del calendari)
      if (initialDate) {
        return initialDate;
      }
      // 2. Si no hi ha 'task' (mode 'create') I no hi ha 'initialDate'
      if (!task) {
        return new Date(); // Creem la data d'avui
      }
      // 3. Altrament (mode edició)
      return undefined;

    }, [initialDate, task]); // <-- Les dependències

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl sm:max-w-6xl md:max-w-7xl">
                {viewMode === 'form' ? (
                    <TaskFormView
                        task={task}
                        onSetViewMode={() => task ? setViewMode('detail') : handleClose()}
                        onTaskMutationSuccess={onTaskMutation} 
                        contacts={contacts ?? []} 
                        initialDepartments={initialDepartments}
                        teamMembers={teamMembers ?? []}
                        // ✅ PAS 3: Passem la data estable (memoitzada)
                        initialDate={formInitialDate}
                    />
                ) : task ? (
                    <TaskDetailView
                        task={task}
                        onSetEditMode={() => setViewMode('form')}
                        onTaskMutation={onTaskMutation}
                        onClose={handleClose}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}