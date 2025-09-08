// src/app/(app)/settings/profile/actions.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Usuari no autenticat." };
  }

  // ✅ CORRECCIÓ: Utilitzem els noms correctes del formulari ('full_name' i 'company_name')
  const fullName = formData.get('full_name') as string;
  const companyName = formData.get('company_name') as string;

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, company_name: companyName })
    .eq('id', user.id);
  
  if (error) {
    console.error("Error updating profile:", error);
    return { success: false, message: "No s'ha pogut actualitzar el perfil." };
  }
  
  // Revalida la ruta per assegurar que la propera vegada que es visiti,
  // es tornin a carregar les dades del servidor amb els nous valors.
  revalidatePath('/settings/profile'); 
  
  return { success: true, message: "Perfil actualitzat correctament." };
}