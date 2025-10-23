// src/components/features/tasks/TaskDialogManager.tsx (COMPLET I CORREGIT)
'use client';

import { useState, useEffect } from 'react';
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
  description_json?: JSONContent | string | null;
  checklist_progress?: { total: number; completed: number } | null;
  departments: { id: number; name: string } | null;
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
    activeTeamId: string; // El manager la rep, però ja no la passa al formulari
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
    initialDate,
}: TaskDialogManagerProps) {
    const [viewMode, setViewMode] = useState<'detail' | 'form'>(task ? 'detail' : 'form');

    useEffect(() => {
        if (open) {
            setViewMode(task ? 'detail' : 'form');
        }
    }, [open, task]);

    const handleClose = () => {
        onOpenChange(false);
    };

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
                        // ✅ LÍNIA ELIMINADA: activeTeamId={activeTeamId}
                        initialDate={initialDate}
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