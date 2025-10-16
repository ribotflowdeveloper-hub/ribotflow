// src/app/[locale]/(app)/crm/calendari/actions.ts

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

// ... (createTask, updateTask, updateTaskDate, deleteTask functions unchanged) ...

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


// ✅ Funció corregida i ampliada per obtenir dades del calendari amb filtre de rang de dates.
export async function getCalendarData(startDate: string, endDate: string) {
    const sessionResult = await validatePageSession();
    if ('error' in sessionResult) {
        // CORRECCIÓ 1: Retorna l'estructura COMPLETA en cas d'error de sessió.
        return { 
            tasks: null, 
            quotes: null, 
            sentEmails: null, 
            receivedEmails: null, 
            error: typeof sessionResult.error === 'object' && sessionResult.error !== null && 'message' in sessionResult.error
                ? (sessionResult.error as { message: string }).message
                : String(sessionResult.error)
        };
    }
    const { supabase, activeTeamId } = sessionResult;


    // Validació de dades d'entrada
    const dateSchema = z.string().datetime({ message: 'La data ha de ser una ISO 8601 string vàlida.' });
    if (!dateSchema.safeParse(startDate).success || !dateSchema.safeParse(endDate).success) {
        // CORRECCIÓ 2: Retorna l'estructura COMPLETA en cas de validació fallida.
        return { 
            tasks: null, 
            quotes: null, 
            sentEmails: null, 
            receivedEmails: null, 
            error: 'Rang de dates invàlid.' 
        };
    }

    // Pas 1: Obtenim la llista d'IDs dels usuaris de l'equip actiu.
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', activeTeamId);

    if (membersError) {
        console.error("Error fetching team members for calendar:", membersError);
        // CORRECCIÓ 3: Retorna l'estructura COMPLETA en cas d'error de membres de l'equip.
        return { 
            tasks: null, 
            quotes: null, 
            sentEmails: null, 
            receivedEmails: null, 
            error: membersError.message 
        };
    }

    const userIdsInTeam = teamMembers.map(member => member.user_id);
    
    // Pas 2: Executem totes les consultes en paral·lel, APLICANT ELS FILTRES DE RANG.
    const [tasksResult, quotesResult, sentEmailsResult, receivedEmailsResult] = await Promise.all([ 
        // 1. Tasques
        supabase
            .from('tasks')
            .select('*, profiles:user_asign_id (id, full_name, avatar_url), contacts(*), departments(*)')
            .eq('team_id', activeTeamId)
            .gte('due_date', startDate) 
            .lte('due_date', endDate),

        // 2. Pressupostos
        supabase
            .from('quotes')
            .select('*, contacts (id, nom)')
            .eq('team_id', activeTeamId)
            .not('expiry_date', 'is', null)
            .gte('expiry_date', startDate) 
            .lte('expiry_date', endDate),

        // 3. Correus Enviats
        supabase
            .from('tickets')
            .select('*, contacts (id, nom)')
            .in('user_id', userIdsInTeam) 
            .eq('type', 'enviat')
            .not('sent_at', 'is', null)
            .gte('sent_at', startDate) 
            .lte('sent_at', endDate),

        // 4. Correus Rebuts
        supabase
            .from('tickets')
            .select('*, contacts (id, nom)')
            .in('user_id', userIdsInTeam)
            .eq('type', 'rebut')
            .not('sent_at', 'is', null)
            .gte('sent_at', startDate) 
            .lte('sent_at', endDate),

    ]);

    const error = tasksResult.error || quotesResult.error || sentEmailsResult.error || receivedEmailsResult.error;

    if (error) {
        console.error("Error fetching calendar data:", {
            tasksError: tasksResult.error,
            quotesError: quotesResult.error,
            sentEmailsError: sentEmailsResult.error,
            receivedEmailsError: receivedEmailsResult.error,  
        });
        // CORRECCIÓ 4: Retorna l'estructura COMPLETA en cas d'error de consulta.
        return { 
            tasks: null, 
            quotes: null, 
            sentEmails: null, 
            receivedEmails: null, 
            error: error ? error.message : 'Error desconegut' 
        };
    }

    return {
        tasks: tasksResult.data as EnrichedTaskForCalendar[],
        quotes: quotesResult.data as EnrichedQuoteForCalendar[],
        sentEmails: sentEmailsResult.data as EnrichedEmailForCalendar[], 
        receivedEmails: receivedEmailsResult.data as EnrichedEmailForCalendar[], 
    };
}