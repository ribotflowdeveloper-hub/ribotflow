'use server';

import { createClient } from "@/lib/supabase/server";
import { validateUserSession } from "@/lib/supabase/session";
import { revalidatePath } from "next/cache";
import { NewTaskPayload } from "@/types/dashboard/types"; // ✅ Importem el nostre tipus centralitzat   
import { Tables } from "@/types/supabase";

export async function addTask(taskData: NewTaskPayload) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: "Not authenticated" } };
  }

  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { activeTeamId } = session;

  const { error } = await supabase
    .from('tasks')
    .insert([{ 
        ...taskData,
        user_id: user.id,
        team_id: activeTeamId,
    }]);

  if (error) {
    console.error('Error creating task:', error);
    return { error };
  }

  revalidatePath('/dashboard');
  return { error: null };
}

// ✅ NOVA ACCIÓ: Afegeix aquesta funció per eliminar una tasca
export async function deleteTask(taskId: number) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: "No autenticat" } };
  }

  // La política RLS ja s'encarrega de verificar que l'usuari
  // només pot eliminar tasques del seu equip.
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error en eliminar la tasca:', error);
    return { error };
  }

  revalidatePath('/dashboard'); // Refresquem les dades del servidor
  return { error: null };
}

// ✅ NOVA ACCIÓ: Afegeix aquesta funció per crear un departament
export async function addDepartment(name: string) {
  const supabase = createClient();

  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { activeTeamId } = session;

  // Intentem inserir el nou departament i retornem la fila creada
  const { data, error } = await supabase
    .from('departments')
    .insert({ name, team_id: activeTeamId })
    .select()
    .single(); // .single() és clau per obtenir l'objecte creat

  if (error) {
    console.error('Error en crear el departament:', error);
    // Gestionem errors de duplicitat d'una manera més amigable
    if (error.code === '23505') {
      return { error: { message: `El departament "${name}" ja existeix.` } };
    }
    return { error };
  }

  revalidatePath('/dashboard'); // Assegurem que les dades del servidor es refresquin
  return { data };
}

// ✅ NOVA ACCIÓ PER ACTUALITZAR UNA TASCA
export async function updateTaskAction(taskId: number, updatedData: Partial<Tables<'tasks'>>) {
    const session = await validateUserSession();
    if ('error' in session) return { error: session.error };
    const { supabase } = session;

    const { error } = await supabase
        .from('tasks')
        .update(updatedData)
        .eq('id', taskId);

    if (error) return { error };

    revalidatePath('/dashboard');
    return { error: null };
}