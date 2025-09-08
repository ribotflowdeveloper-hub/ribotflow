"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers"; // Importem la funció cookies

export async function addRuleAction(formData: FormData) {
  // ✅ Afegim la lògica per obtenir les cookies i crear el client de Supabase
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // ✅ Utilitzem la comprovació segura per obtenir l'usuari
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return { success: false, message: "Usuari no autenticat." };
  }
  const user = authData.user;

  const newRule = formData.get('newRule') as string;
  if (!newRule || !newRule.trim()) {
    return { success: false, message: "La regla no pot estar buida." };
  }

  const value = newRule.trim().toLowerCase();
  const rule_type = value.includes('@') ? 'email' : 'domain';

  const { error } = await supabase.from('blacklist_rules').insert({ 
    user_id: user.id, 
    value, 
    rule_type 
  });

  if (error) {
    console.error('Error afegint regla:', error);
    return { success: false, message: "No s'ha pogut afegir la regla. Potser ja existeix." };
  }

  revalidatePath('/settings/blacklist');
  return { success: true, message: "Regla afegida correctament." };
}

export async function deleteRuleAction(id: string) {
  // ✅ Afegim la lògica per obtenir les cookies i crear el client de Supabase
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // ✅ Utilitzem la comprovació segura per obtenir l'usuari
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return { success: false, message: "Usuari no autenticat." };
  }
  const user = authData.user;
  
  const { error } = await supabase.from('blacklist_rules').delete().match({ id: id, user_id: user.id });

  if (error) {
    console.error('Error eliminant regla:', error);
    return { success: false, message: "No s'ha pogut eliminar la regla." };
  }
  
  revalidatePath('/settings/blacklist');
  return { success: true, message: "Regla eliminada." };
}

