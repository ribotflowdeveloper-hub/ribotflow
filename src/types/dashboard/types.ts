import { Database, Tables } from "@/types/supabase";

// ✅ Accedim al tipus de l'enum 'task_priority' directament des dels tipus generats
export type TaskPriority = Database['public']['Enums']['task_priority'];

// Aquest serà el nostre tipus centralitzat per a la creació de tasques
export type NewTaskPayload = {
  title: string;
  description: string | null;
  due_date: string | null; // La data s'envia al servidor com a string ISO
  priority: TaskPriority | null;
  contact_id: number | null;
};

// ✅ NOU TIPUS: Aquest serà el nostre tipus de tasca per a TOTA l'aplicació
export type TaskWithContact = Tables<'tasks'> & {
  contacts: { id: number; nom: string; } | null;
};