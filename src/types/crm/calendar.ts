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


// src/types/crm/index.ts (o el teu fitxer de tipus)

export interface CalendarEvent {
  id: number | string; // ✅ SOLUCIÓ 1: Ara pot ser un número o un text.
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: unknown; // Use 'unknown' for a safer alternative to 'any'.
  eventType?: 'task' | 'quote' | 'email' | 'receivedEmail' | 'skeleton'; // ✅ SOLUCIÓ 2: Afegim 'skeleton' com a tipus vàlid.
}

// 🧠 Definició centralitzada de l'estat dels filtres (ActiveSources)
// Aquest tipus és el contracte entre el Client Component i la Server Action.
export type ActiveSources = {
    tasks: boolean;
    quotes: boolean;
    emails: boolean;
    receivedEmails: boolean;
};

// Tipus per a l'estat del formulari
export type FormState = {
  error?: {
    form?: string;
    db?: string;
    title?: string[];
    description?: string[];
    due_date?: string[];
    priority?: string[];
    user_id?: string[];
  };
  success?: boolean;
};