'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUserSession } from '@/lib/supabase/session';

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