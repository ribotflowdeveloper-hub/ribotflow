"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";


export async function saveOpportunityAction(
  formData: FormData
): Promise<{ error: { message: string } | null }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: 'Usuari no autenticat.' } };
  }

  const id = formData.get('id') as string | null;

  const dataToSave = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    contact_id: formData.get('contact_id') as string,
    stage_name: formData.get('stage_name') as string,
    value: parseFloat(formData.get('value') as string) || 0,
    close_date: formData.get('close_date') ? new Date(formData.get('close_date') as string).toISOString() : null,
  };

  if (!dataToSave.name || !dataToSave.contact_id) {
    return { error: { message: 'El nom i el contacte són obligatoris.' } };
  }
  
  let error;
  if (id && id !== 'new') { // Mode Edició
    ({ error } = await supabase.from('opportunities').update(dataToSave).eq('id', id));
  } else { // Mode Creació
    ({ error } = await supabase.from('opportunities').insert({ ...dataToSave, user_id: user.id }));
  }

  if (error) {
    console.error("Error en desar l'oportunitat:", error);
    return { error };
  }
  
  // Revalida el path per assegurar que la pàgina del pipeline mostri les noves dades
  revalidatePath('/crm/pipeline');
  return { error: null };
}