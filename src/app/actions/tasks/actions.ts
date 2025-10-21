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
    duration?: string[];
  };
  success?: boolean;
};

const taskSchema = z.object({
  title: z.string().min(1, 'El títol és obligatori.'),
  description: z.string().nullable().optional(),
  due_date: z.string().datetime('La data de venciment ha de ser una data vàlida.'),
  priority: z.enum(['Baixa', 'Mitjana', 'Alta']),
  user_asign_id: z.string().uuid().nullable().optional(), // Es manté com a string (UUID)
  contact_id: z.coerce.number().nullable().optional(), // ✅ CORRECCIÓ: Convertim a número
  department_id: z.coerce.number().nullable().optional(), // ✅ CORRECCIÓ: Convertim a número
  duration: z.coerce.number().positive('La duració ha de ser un número positiu.').optional().nullable(),
});

const processFormData = (formData: FormData) => {
  let userId = formData.get('user_asign_id');
  if (userId === 'none') userId = null;

  let contactId = formData.get('contact_id');
  if (contactId === 'none') contactId = null;

  let departmentId = formData.get('department_id');
  if (departmentId === 'none') departmentId = null;

  const duration = formData.get('duration');

  return {
    title: formData.get('title'),
    description: formData.get('description') || null,
    due_date: new Date(formData.get('due_date') as string).toISOString(),
    priority: formData.get('priority'),
    user_asign_id: userId,
    contact_id: contactId ? parseInt(contactId as string, 10) : null,
    department_id: departmentId ? parseInt(departmentId as string, 10) : null,
    duration: duration ? parseFloat(duration as string) : null,
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

  const dataToInsert: Partial<Tables<'tasks'>> = {
    ...validatedFields.data,
    team_id: activeTeamId,
    user_id: user.id,
  };

  if (validatedFields.data.user_asign_id) {
    dataToInsert.asigned_date = new Date().toISOString(); 
  }

  const { error } = await supabase.from('tasks').insert({
    ...dataToInsert
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

  // Obtenim la tasca actual per comparar l'usuari assignat
  const { data: currentTask, error: fetchError } = await supabase.from('tasks').select('user_asign_id').eq('id', taskId).single();
  if (fetchError) return { error: { db: `No s'ha pogut obtenir la tasca actual: ${fetchError.message}` } };

  const parsedData = processFormData(formData);
  const validatedFields = taskSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }
  
  const dataToUpdate: Partial<Tables<'tasks'>> = { ...validatedFields.data };

  const newAssignedId = validatedFields.data.user_asign_id;
  const oldAssignedId = currentTask.user_asign_id;

  // S'actualitza la data d'assignació si:
  // 1. S'assigna un usuari nou (abans no n'hi havia).
  // 2. Es canvia l'usuari assignat per un altre.
  if (newAssignedId && newAssignedId !== oldAssignedId) {
    dataToUpdate.asigned_date = new Date().toISOString();
  } else if (!newAssignedId && oldAssignedId) {
    // Si es desassigna un usuari, netegem la data.
    dataToUpdate.asigned_date = null;
  }

  const { error } = await supabase
    .from('tasks')
    .update(dataToUpdate)
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

export async function setTaskActiveStatus(taskId: number, newStatus: boolean) {
  console.log(`--- [Server Action] Canviant estat de la tasca ${taskId} a ${newStatus} ---`);

  const session = await validateUserSession();
  // Retornem un objecte d'error coherent amb les altres funcions
  if ('error' in session) {
    return { error: { message: session.error.message } };
  }
  const { supabase } = session;

  // Cridem la funció 'log_task_activity' que hem creat a la base de dades
  const { error } = await supabase.rpc('log_task_activity', {
    task_id_input: taskId,
    new_status_input: newStatus
  });

  if (error) {
    console.error("Error en RPC 'log_task_activity':", error);
    return { error: { message: error.message } };
  }

  // Revalidem les rutes per refrescar la UI, igual que a les altres accions
  revalidatePath('/[locale]/(app)/crm/calendari', 'layout');
  revalidatePath('/[locale]/(app)/dashboard', 'layout');

  // Retornem èxit
  return { data: { success: true } };
}