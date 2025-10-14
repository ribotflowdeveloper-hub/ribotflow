'use client';

import { useState, useMemo } from 'react';
import { updateTaskDate } from '../actions';
import { toast } from 'sonner';
import { CalendarEvent, TaskWithAssignee } from '@/types/crm';

export default function useCalendar(initialTasks: TaskWithAssignee[]) {
  // L'estat de les tasques es gestiona aquí per a l'actualització optimista del drag-and-drop.
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);

  const events: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter(task => task.due_date)
      .map(task => ({
        id: Number(task.id),
        title: `${task.title} (${task.profiles?.full_name || 'Sense assignar'})`,
        start: new Date(task.due_date!),
        end: new Date(task.due_date!),
        allDay: true,
        resource: task,
      }));
  }, [tasks]);

  const handleMoveEvent = async ({ event, start }: { event: CalendarEvent, start: string | Date }) => {
    const taskId = event.id;
    const newDueDate = new Date(start).toISOString();
    const originalTasks = tasks;

    // Actualització optimista
    setTasks(currentTasks => 
        currentTasks.map(t => 
            t.id === taskId ? { ...t, due_date: newDueDate } : t
        )
    );

    const result = await updateTaskDate(taskId, newDueDate);

    if (result.error) {
        toast.error("Error en actualitzar la data.", { description: result.error.db });
        setTasks(originalTasks); // Revertim en cas d'error
    } else {
        toast.success("Tasca actualitzada.");
    }
  };

  // El hook ara només retorna el que és estrictament necessari per al calendari.
  return { events, handleMoveEvent };
}