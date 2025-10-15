'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUserSession, validatePageSession } from '@/lib/supabase/session';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from './_components/CalendarData';

// Tipus per a l'estat del formulari
type FormState = {
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

// Zod Schema per a la validació de les dades de la tasca
const taskSchema = z.object({
  title: z.string().min(1, 'El títol és obligatori.'),
  description: z.string().nullable().optional(),
  due_date: z.string().datetime('La data de venciment ha de ser una data vàlida.'),
  priority: z.enum(['Baixa', 'Mitjana', 'Alta']),
  user_id: z.string().uuid().nullable().optional(),
});

export async function createTask(prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) return { error: { form: session.error.message } };
  const { supabase, activeTeamId } = session;

  const validatedFields = taskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    due_date: new Date(formData.get('due_date') as string).toISOString(),
    priority: formData.get('priority') as 'Baixa' | 'Mitjana' | 'Alta',
    user_id: formData.get('user_id') || null,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from('tasks').insert({
    ...validatedFields.data,
    team_id: activeTeamId,
  });

  if (error) return { error: { db: error.message } };

  revalidatePath('/[locale]/crm/calendari', 'layout');
  return { success: true };
}

export async function updateTask(prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) return { error: { form: session.error.message } };
  const { supabase } = session;

  const taskId = Number(formData.get('taskId'));
  if (!taskId) return { error: { form: 'ID de la tasca no trobat.' } };

  const validatedFields = taskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    due_date: new Date(formData.get('due_date') as string).toISOString(),
    priority: formData.get('priority') as 'Baixa' | 'Mitjana' | 'Alta',
    user_id: formData.get('user_id') || null,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from('tasks')
    .update(validatedFields.data)
    .eq('id', taskId);

  if (error) return { error: { db: error.message } };

  revalidatePath('/[locale]/crm/calendari', 'layout');
  return { success: true };
}

export async function updateTaskDate(taskId: number, newDueDate: string) {
  const session = await validateUserSession();
  if ('error' in session) {
    return { error: { db: session.error.message } };
  }
  const { supabase } = session;

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: newDueDate })
    .eq('id', taskId);

  if (error) {
    return { error: { db: error.message } };
  }

  revalidatePath('/[locale]/crm/calendari', 'layout');
  return { success: true };
}

export async function deleteTask(taskId: number) {
  const session = await validateUserSession();
  if ('error' in session) {
    return { error: { db: session.error.message } };
  }
  const { supabase } = session;

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    return { error: { db: error.message } };
  }

  revalidatePath('/[locale]/crm/calendari', 'layout');
  return { success: true };
}

// ... (imports i altres actions) ...

// ✅ Funció corregida i ampliada per obtenir TOTES les dades del calendari
export async function getCalendarData() {
  const { supabase, activeTeamId } = await validatePageSession();

  // Pas 1: Obtenim la llista d'IDs dels usuaris de l'equip actiu.
  const { data: teamMembers, error: membersError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', activeTeamId);

  // Si no podem obtenir els membres, no podem continuar.
  if (membersError) {
    console.error("Error fetching team members for calendar:", membersError);
    return { tasks: null, quotes: null, emails: null, error: membersError.message };
  }

  // Creem un array només amb els UUIDs dels usuaris.
  const userIdsInTeam = teamMembers.map(member => member.user_id);

  // Si l'equip no té membres, userIdsInTeam serà un array buit, la qual cosa és correcte.

  // Pas 2: Executem totes les consultes en paral·lel.
  const [tasksResult, quotesResult, sentEmailsResult, receivedEmailsResult] = await Promise.all([ // ✅ Afegim una nova promesa
    // Tasques (Aquesta consulta ja era correcta)
    supabase
      .from('tasks')
      .select('*, profiles:user_asign_id (id, full_name, avatar_url), contacts(*), departments(*)')
      .eq('team_id', activeTeamId),

    // Pressupostos (Aquesta consulta ja era correcta)
    supabase
      .from('quotes')
      .select('*, contacts (id, nom)')
      .eq('team_id', activeTeamId)
      .not('expiry_date', 'is', null),

    // Correus Enviats (Consulta corregida)
    supabase
      .from('tickets')
      .select('*, contacts (id, nom)')
      .in('user_id', userIdsInTeam) // ✅ CORRECCIÓ: Filtrem per la llista d'usuaris de l'equip.
      .eq('type', 'enviat')
      .not('sent_at', 'is', null),

    supabase
      .from('tickets')
      .select('*, contacts (id, nom)')
      .in('user_id', userIdsInTeam)
      .eq('type', 'rebut')
      .not('sent_at', 'is', null)


  ]);
  const error = tasksResult.error || quotesResult.error || sentEmailsResult.error || receivedEmailsResult.error;

  if (error) {
    // Millorem el log per identificar quin error és exactament
    console.error("Error fetching calendar data:", {
      tasksError: tasksResult.error,
      quotesError: quotesResult.error,
      sentEmailsError: sentEmailsResult.error,
      receivedEmailsError: receivedEmailsResult.error,  
    });
    return { tasks: null, quotes: null, sentEmails: null, receivedEmails: null, error: error ? error.message : 'Error desconegut' };
  }

  return {
    tasks: tasksResult.data as EnrichedTaskForCalendar[],
    quotes: quotesResult.data as EnrichedQuoteForCalendar[],
    sentEmails: sentEmailsResult.data as EnrichedEmailForCalendar[], // Canviem el nom per claredat
    receivedEmails: receivedEmailsResult.data as EnrichedEmailForCalendar[], // ✅ Noves dades

  };
}