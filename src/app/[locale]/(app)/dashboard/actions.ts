'use server';

import { createClient } from "@/lib/supabase/server";
import { getActiveTeam } from "@/lib/supabase/teams"; // ✅ 1. Importem la nostra funció per obtenir l'equip
import { revalidatePath } from "next/cache";
import { NewTaskPayload } from "@/types/dashboard/types"; // ✅ Importem el nostre tipus centralitzat   

export async function addTask(taskData: NewTaskPayload) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: "Not authenticated" } };
  }

  // ✅ 2. Obtenim l'equip actiu de l'usuari
  const team = await getActiveTeam();
  if (!team) {
    return { error: { message: "Active team not found" } };
  }

  const { error } = await supabase
    .from('tasks')
    .insert([{ 
        ...taskData,
        user_id: user.id,
        team_id: team.id, // ✅ 3. Afegim l'ID de l'equip a l'objecte que inserim
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "No autenticat" } };

  const team = await getActiveTeam();
  if (!team) return { error: { message: "Equip actiu no trobat" } };

  // Intentem inserir el nou departament i retornem la fila creada
  const { data, error } = await supabase
    .from('departments')
    .insert({ name, team_id: team.id })
    .select()
    .single(); // .single() és clau per obtenir l'objecte creat

  if (error) {
    console.error('Error en crear el departament:', error);
    // Gestionem errors de duplicitat d'una manera més amigable
    if (error.code === '23505') { // Codi d'error per a violació de clau única
      return { error: { message: `El departament "${name}" ja existeix.` } };
    }
    return { error };
  }

  revalidatePath('/dashboard'); // Assegurem que les dades del servidor es refresquin
  return { data };
}