"use client";

import { useCallback, useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { v4 as uuidv4 } from 'uuid';
import type { Task } from "@/types/crm";
import { updateTaskStatusAction, deleteTaskAction, createTaskAction } from "../actions";

export function useTaskManager(initialTasks: Task[]) {
  const t = useTranslations("DashboardClient");
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sincronitza l'estat si les dades inicials canvien
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // --- LÒGICA PER AFEGIR TASCA (la part nova) ---
  const handleAddTask = useCallback(
    async (title: string, contact_id: string | null, user_id: string) => {
      const optimisticTask: Task = {
        id: uuidv4(), // ID temporal
        created_at: new Date().toISOString(),
        title,
        contact_id,
        user_id,
        is_completed: false,
        // Afegeix altres camps del tipus Task amb valors per defecte si cal
        due_date: null,
        priority: null,
        contacts: null, // o busca el contacte a les dades inicials si el tens
      };

      // Actualització optimista
      setTasks((prev) => [optimisticTask, ...prev]);

      startTransition(async () => {
        const result = await createTaskAction(title, contact_id);
        if (result.success && result.data) {
          // Reemplacem la tasca optimista per la real del servidor
          setTasks((prev) =>
            prev.map((t) => (t.id === optimisticTask.id ? result.data! : t))
          );
        } else {
          toast.error(t("toast.errorTitle"), { description: result.message });
          // Revertim l'actualització optimista en cas d'error
          setTasks((prev) => prev.filter((t) => t.id !== optimisticTask.id));
        }
      });
    },
    [t] // Ja no depèn de `tasks`!
  );

  // --- LÒGICA PER ACTUALITZAR I ESBORRAR (millorada) ---
  const handleUpdateStatus = useCallback(
    (taskId: string, newStatus: boolean) => {
      const previousTasks = tasks; // Guardem l'estat anterior per revertir
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_completed: newStatus } : t))
      );
      setSelectedTask(null);

      startTransition(async () => {
        const result = await updateTaskStatusAction(taskId, newStatus);
        if (!result.success) {
          toast.error(t("toast.errorTitle"), { description: result.message });
          setTasks(previousTasks); // Revertim
        }
      });
    },
    [tasks, t] // Mantenim `tasks` aquí per la còpia de `previousTasks`
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      const previousTasks = tasks;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);

      startTransition(async () => {
        const result = await deleteTaskAction(taskId);
        if (!result.success) {
          toast.error(t("toast.errorTitle"), { description: result.message });
          setTasks(previousTasks); // Revertim
        }
      });
    },
    [tasks, t]
  );

  return {
    tasks,
    selectedTask,
    setSelectedTask,
    handleAddTask,
    handleUpdateStatus,
    handleDelete,
    isPending,
  };
}