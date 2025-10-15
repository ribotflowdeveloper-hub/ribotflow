// src/app/[locale]/(app)/crm/calendari/_hooks/useCalendar.tsx
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { updateTaskDate } from '../actions';
import { CalendarEvent } from '@/types/crm';
import { EnrichedTaskForCalendar } from '../_components/CalendarData';

// El hook ara rep les tasques actuals i una funció per notificar un canvi
export default function useCalendar(
  tasks: EnrichedTaskForCalendar[],
  onTaskMove: (taskId: number, newDueDate: string) => void
) {

  const handleMoveEvent = useCallback(async ({ event, start }: { event: CalendarEvent, start: string | Date }) => {
    // Només gestionem tasques per ara
    if (event.eventType !== 'task') return;
    
    const taskId = Number(event.id);
    const newDueDate = new Date(start).toISOString();
    const originalTask = tasks.find(t => t.id === taskId);
    
    if (!originalTask) return;

    // Notifiquem al component pare per a l'actualització optimista
    onTaskMove(taskId, newDueDate);

    const result = await updateTaskDate(taskId, newDueDate);

    if (result.error) {
        toast.error("Error en actualitzar la data.", { description: result.error.db });
        // Si hi ha error, revertim a la data original
        onTaskMove(taskId, originalTask.due_date!);
    } else {
        toast.success("Tasca actualitzada correctament.");
    }
  }, [tasks, onTaskMove]);

  return { handleMoveEvent };
}