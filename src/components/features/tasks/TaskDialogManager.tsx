'use client';

import { useState, useEffect } from 'react';
import { TaskDetailView } from './TaskDetailView';
import { TaskFormView } from './TaskFormView';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tables } from '@/types/supabase';
import { JSONContent } from '@tiptap/react'; // <-- Importa
interface TimeTrackingLogEntry {
    status: 'active' | 'inactive';
    timestamp: string;
}

// Aquest serà el nostre nou tipus de tasca universal
export type EnrichedTask = Tables<'tasks'> & {
    contacts: { id: number; nom: string } | null;
    profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    // Afegeix tipus explícits per als camps JSONB si supabase.ts no els infereix bé
    description_json?: JSONContent | string | null; // Pot venir com string o objecte
    checklist_progress?: { total: number; completed: number } | null;
    departments: { id: number; name: string } | null;
    time_tracking_log: TimeTrackingLogEntry[] | null;
    is_active: boolean;
};

interface TaskDialogManagerProps {
    task: EnrichedTask | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // Llistes de dades necessàries per al formulari
    contacts: Tables<'contacts'>[];
    departments: Tables<'departments'>[];
    teamMembers: { id: string; full_name: string | null }[];

    // ✅ CANVI CLAU: Modifiquem la definició de onTaskMutation.
    // Ara pot rebre un objecte opcional amb instruccions.
    onTaskMutation: (options?: { closeDialog?: boolean }) => void;

    initialDate?: Date;
}

export function TaskDialogManager({
    task,
    open,
    onOpenChange,
    contacts,
    departments,
    teamMembers,
    onTaskMutation,
    initialDate,
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
            <DialogContent className="sm:max-w-6xl">
                {isEditing ? (
                    <TaskFormView
                        task={task}
                        onSetViewMode={() => setIsEditing(false)}
                        contacts={contacts}
                        departments={departments}
                        teamMembers={teamMembers}
                        // La funció modificada es passa al formulari
                        onTaskMutation={onTaskMutation}
                        initialDate={initialDate}
                    />
                ) : (
                    <TaskDetailView
                        task={task!} // Si no editem, la tasca sempre existeix
                        onSetEditMode={() => setIsEditing(true)}
                        // La funció modificada es passa a la vista de detall
                        onTaskMutation={onTaskMutation}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}