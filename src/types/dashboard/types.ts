import { Database, Tables } from "@/types/supabase";

export type TaskPriority = Database['public']['Enums']['task_priority'];

// Aquest tipus és per a la CREACIÓ. Enviem només els IDs.
export type NewTaskPayload = {
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority | null;
  contact_id: number | null;
  department_id: number | null; // ✅ CORRECCIÓ: Afegeix el camp per a l'ID del departament
};

// Aquest tipus és per a la VISUALITZACIÓ. Rebem els objectes niuats.
export type TaskWithContact = Tables<'tasks'> & {
  contacts: { id: number; nom: string; } | null;
  departments: { id: number; name: string; } | null; // ✅ CORRECCIÓ: Afegeix l'objecte department
};