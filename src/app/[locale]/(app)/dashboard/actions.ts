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
  const team = await getActiveTeam(user.id);
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