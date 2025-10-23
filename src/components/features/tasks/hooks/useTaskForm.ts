// src/components/features/tasks/useTaskForm.ts
'use client';

import { useState, useTransition, FormEvent, useEffect, useCallback } from 'react';
import { createTask, updateTask } from '@/app/actions/tasks/actions';
import { EnrichedTask } from '../TaskDialogManager';
import { toast } from 'sonner';
import { JSONContent } from '@tiptap/react';
import { format } from 'date-fns';

// Definim les props que el hook necessita del seu component pare
interface UseTaskFormProps {
  task: EnrichedTask | null;
  onTaskMutationSuccess: () => void;
  initialDate?: Date;
  // activeTeamId no cal si les server actions ja l'obtenen de la sessió
}

export function useTaskForm({
  task,
  onTaskMutationSuccess,
  initialDate,
}: UseTaskFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!task;

  // --- Estats Locals del Formulari ---
  const getInitialDate = useCallback(() => initialDate || (task?.due_date ? new Date(task.due_date) : undefined), [initialDate, task?.due_date]);

  const [dueDate, setDueDate] = useState<Date | undefined>(getInitialDate());
  const [selectedContactId, setSelectedContactId] = useState<string | null>(task?.contact_id?.toString() ?? null);
  const [assignedUserId, setAssignedUserId] = useState<string | null>(task?.user_asign_id ?? null);
  
  const [descriptionContent, setDescriptionContent] = useState<string>(task?.description ?? '');
  const [descriptionJson, setDescriptionJson] = useState<JSONContent | null>(() => {
    try {
      if (task?.description_json) {
        return typeof task.description_json === 'string'
          ? JSON.parse(task.description_json)
          : task.description_json as JSONContent;
      } return null;
    } catch { return null; }
  });

  const [contactComboboxOpen, setContactComboboxOpen] = useState(false);
  const [teamMemberComboboxOpen, setTeamMemberComboboxOpen] = useState(false);

  // --- Efecte per sincronitzar si la tasca canvia (ex: obrir un altre diàleg) ---
  useEffect(() => {
    setDueDate(getInitialDate());
    setSelectedContactId(task?.contact_id?.toString() ?? null);
    setAssignedUserId(task?.user_asign_id ?? null);
    setDescriptionContent(task?.description ?? '');
    setDescriptionJson(() => {
      try {
        if (task?.description_json) {
          return typeof task.description_json === 'string'
            ? JSON.parse(task.description_json)
            : task.description_json as JSONContent;
        } return null;
      } catch { return null; }
    });
  }, [task, getInitialDate]);

  // --- Gestor d'Enviament (Server Action) ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Injectem valors controlats
    formData.set('description', descriptionContent);
    formData.set('description_json', JSON.stringify(descriptionJson));
    formData.set('due_date', dueDate ? dueDate.toISOString() : '');
    formData.set('contact_id', selectedContactId ?? 'none');
    formData.set('user_asign_id', assignedUserId ?? 'none');
    
    if (task) {
      formData.set('taskId', task.id.toString());
    }

    const action = task ? updateTask : createTask;

    startTransition(async () => {
      const result = await action({}, formData);

      if (result.error) {
        let errorDesc = 'Hi ha hagut un error.';
        if (typeof result.error === 'string') { errorDesc = result.error; }
        else if (typeof result.error === 'object') { 
          errorDesc = Object.entries(result.error)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n'); 
        }
        toast.error('Error al guardar', { description: errorDesc });
      } else if (result.success) {
        toast.success(task ? 'Tasca actualitzada!' : 'Tasca creada!');
        onTaskMutationSuccess();
      }
    });
  };

  // --- Valors inicials per a camps no controlats ---
  const initialValues = {
    title: task?.title ?? '',
    priority: task?.priority ?? 'Mitjana',
    duration: task?.duration ?? '',
    departmentId: task?.department_id?.toString() ?? 'none',
    assignmentDate: task?.asigned_date ? format(new Date(task.asigned_date), "dd/MM/yyyy") : '-',
  };

  // Retornem l'estat i els gestors
  return {
    isPending,
    isEditing,
    handleSubmit,
    initialValues,
    state: {
      dueDate,
      selectedContactId,
      assignedUserId,
      descriptionContent,
      descriptionJson,
      contactComboboxOpen,
      teamMemberComboboxOpen,
    },
    handlers: {
      setDueDate,
      setSelectedContactId,
      setAssignedUserId,
      setDescriptionContent,
      setDescriptionJson,
      setContactComboboxOpen,
      setTeamMemberComboboxOpen,
    },
  };
}