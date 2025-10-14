'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUserSession } from '@/lib/supabase/session';
import { Tables } from '@/types/supabase'; // Assegura't que aquest import hi és

// Aquest fitxer conté tota la lògica de negoci per a les TASQUES.
// És la ÚNICA FONT DE VERITAT per a crear, modificar o eliminar tasques.

type FormState = {
  error?: {
    form?: string;
    db?: string;
    title?: string[];
    description?: string[];
    due_date?: string[];
    priority?: string[];
    user_asign_id?: string[];
    contact_id?: string[];
    department_id?: string[];
  };
  success?: boolean;
};

const taskSchema = z.object({
  title: z.string().min(1, 'El títol és obligatori.'),
  description: z.string().nullable().optional(),
  due_date: z.string().datetime('La data de venciment ha de ser una data vàlida.'),
  priority: z.enum(['Baixa', 'Mitjana', 'Alta']),
  user_asign_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  department_id: z.string().nullable().optional(),
});

const processFormData = (formData: FormData) => {
  let userId = formData.get('user_asign_id');
  if (userId === 'none') userId = null;

  let contactId = formData.get('contact_id');
  if (contactId === 'none') contactId = null;

  let departmentId = formData.get('department_id');
  if (departmentId === 'none') departmentId = null;

  return {
    title: formData.get('title'),
    description: formData.get('description') || null,
    due_date: new Date(formData.get('due_date') as string).toISOString(),
    priority: formData.get('priority'),
    user_asign_id: userId,
    contact_id: contactId,
    department_id: departmentId
  };
};

export async function createTask(prevState: FormState, formData: FormData): Promise<FormState> {
  console.log("--- [Server Action] La funció 'createTask' s'ha executat! ---");

  const session = await validateUserSession();
  if ('error' in session) return { error: { form: session.error.message } };
  const { supabase, activeTeamId, user } = session;

  const parsedData = processFormData(formData);
  const validatedFields = taskSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from('tasks').insert({
    ...validatedFields.data,
    team_id: activeTeamId,
    user_id: user.id,
  });

  if (error) return { error: { db: error.message } };

  // Revalidem totes les rutes on es mostren tasques
  revalidatePath('/[locale]/(app)/crm/calendari', 'layout');
  revalidatePath('/[locale]/(app)/dashboard', 'layout');
  return { success: true };
}

export async function updateTask(prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) return { error: { form: session.error.message } };
  const { supabase } = session;

  const taskId = Number(formData.get('taskId'));
  if (!taskId) return { error: { form: 'ID de la tasca no trobat.' } };

  const parsedData = processFormData(formData);
  const validatedFields = taskSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from('tasks')
    .update(validatedFields.data)
    .eq('id', taskId);

  if (error) return { error: { db: error.message } };

  // Revalidem totes les rutes on es mostren tasques
  revalidatePath('/[locale]/(app)/crm/calendari', 'layout');
  revalidatePath('/[locale]/(app)/dashboard', 'layout');
  return { success: true };
}

export async function deleteTask(taskId: number) {
  const session = await validateUserSession();
  if ('error' in session) return { error: { db: session.error.message } };
  const { supabase } = session;

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) return { error: { db: error.message } };

  revalidatePath('/[locale]/(app)/crm/calendari', 'layout');
  revalidatePath('/[locale]/(app)/dashboard', 'layout');
  return { success: true };
}

// ✅ NOVA ACCIÓ PER A ACTUALITZACIONS SIMPLES
export async function updateSimpleTask(taskId: number, updatedData: Partial<Tables<'tasks'>>) {
  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { supabase } = session;

  const { error } = await supabase
    .from('tasks')
    .update(updatedData)
    .eq('id', taskId);

  if (error) {
    console.error("Error updating simple task:", error);
    return { error };
  }

  revalidatePath('/[locale]/(app)/crm/calendari', 'layout');
  revalidatePath('/[locale]/(app)/dashboard', 'layout');
  return { error: null };
}