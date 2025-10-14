'use client';

import { useState, useEffect } from 'react';
import { TaskDetailView } from './TaskDetailView';
import { TaskFormView } from './TaskFormView';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tables } from '@/types/supabase';

// Aquest serà el nostre nou tipus de tasca universal
export type EnrichedTask = Tables<'tasks'> & {
  contacts: { id: number; nom: string } | null;
  profiles: { id: string; full_name: string | null } | null;
  departments: { id: number; name: string } | null;
};

interface TaskDialogManagerProps {
  task: EnrichedTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Llistes de dades necessàries per al formulari
  contacts: Tables<'contacts'>[];
  departments: Tables<'departments'>[];
  teamMembers: { id: string; full_name: string | null }[];
  // Callback per refrescar les dades a la vista principal
  onTaskMutation: () => void;
}

export function TaskDialogManager({
  task,
  open,
  onOpenChange,
  contacts,
  departments,
  teamMembers,
  onTaskMutation,
}: TaskDialogManagerProps) {
  // 'isEditing' controla si mostrem la vista de detalls o el formulari
  const [isEditing, setIsEditing] = useState(false);

  // Cada cop que obrim un nou diàleg, resetejem al mode vista (si la tasca ja existeix)
  useEffect(() => {
    if (open) {
      // Si no hi ha tasca (és nova), directament mostrem el formulari
      setIsEditing(!task);
    }
  }, [open, task]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {isEditing ? (
          <TaskFormView
            task={task}
            onSetViewMode={() => setIsEditing(false)}
            contacts={contacts}
            departments={departments}
            teamMembers={teamMembers}
            onTaskMutation={onTaskMutation}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <TaskDetailView
            task={task!} // Si no editem, la tasca sempre existeix
            onSetEditMode={() => setIsEditing(true)}
            onTaskMutation={onTaskMutation}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}