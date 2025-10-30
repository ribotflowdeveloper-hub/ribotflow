// src/components/features/tasks/TaskFormView.tsx
'use client';

import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnrichedTask } from './TaskDialogManager';
import { Tables } from '@/types/supabase';
import { useTaskForm } from './hooks/useTaskForm'; // Importem el Hook
import { TaskFormActions } from './TaskFormActrions';
import { TaskFormPrimary } from './TaskFormPrimary'; // Importem Columna Esquerra
import { TaskFormSecondary } from './TaskFormSecondary'; // Importem Columna Dreta

// --- Props ---
interface TaskFormViewProps {
  task: EnrichedTask | null;
  onSetViewMode: () => void;
  onTaskMutationSuccess: () => void;
  contacts: Tables<'contacts'>[];
  initialDepartments: Tables<'departments'>[];
  teamMembers: { id: string; full_name: string | null }[];
  initialDate?: Date;
}

// --- Component Principal del Formulari ---
export function TaskFormView({
  task,
  onSetViewMode,
  onTaskMutationSuccess,
  contacts,
  initialDepartments = [],
  teamMembers,
  initialDate,
}: TaskFormViewProps) {
  // 1. Tota la lògica i l'estat venen del hook
  const {
    isPending,
    isEditing,
    handleSubmit,
    initialValues,
    state,
    handlers,
  } = useTaskForm({
    task,
    onTaskMutationSuccess,
    initialDate,
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">{isEditing ? 'Editar Tasca' : 'Crear Nova Tasca'}</DialogTitle>
      </DialogHeader>

      {/* 2. El 'form' utilitza el handleSubmit del hook */}
      <form onSubmit={handleSubmit}>
        
        {/* Camp ocult per a l'edició */}
        {task && <input type="hidden" name="taskId" value={task.id} />}

        {/* 3. Implementem el nou layout (Esquerra / Dreta) */}
        
        {/* ✅ CANVI: Canviat de lg:grid-cols-5 a lg:grid-cols-3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-4 custom-scrollbar">
          
          {/* Columna Esquerra (Títol i Descripció) */}
          {/* ✅ CANVI: Canviat de lg:col-span-3 a lg:col-span-2 */}
          <div className="lg:col-span-2">
            <TaskFormPrimary
              initialTitle={initialValues.title}
              descriptionContent={state.descriptionContent}
              onDescriptionChange={(html, json) => {
                handlers.setDescriptionContent(html);
                handlers.setDescriptionJson(json);
              }}
            />
          </div>

          {/* Columna Dreta (Metadades) */}
          {/* ✅ CANVI: Canviat de lg:col-span-2 a lg:col-span-1 */}
          <div className="lg:col-span-1">
            <TaskFormSecondary
              state={state}
              handlers={handlers}
              initialValues={initialValues}
              contacts={contacts}
              teamMembers={teamMembers}
              departments={initialDepartments}
            />
          </div>

        </div>

        {/* 4. Accions del formulari (component importat) */}
        <TaskFormActions
          isEditing={isEditing} 
          onSetViewMode={onSetViewMode} 
          isPending={isPending} 
        />
      </form>
    </>
  );
}