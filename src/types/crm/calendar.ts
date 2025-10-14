import { Tables } from '@/types/supabase';

// Aquest tipus ara defineix 'profiles' amb les dues propietats que seleccionem a la consulta,
// fent-lo més precís i ajudant a TypeScript.
export type TaskWithAssignee = Omit<Tables<'tasks'>, 'user_id'> & {
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null; // ✅ SOLUCIÓ: Afegim la propietat que faltava.

  } | null;
  user_id: string | null; // Mantenim user_id per al diàleg d'edició
};


// Aquest tipus no canvia.
export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: TaskWithAssignee;
}