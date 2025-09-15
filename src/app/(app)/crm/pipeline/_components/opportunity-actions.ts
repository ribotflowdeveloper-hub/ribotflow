"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Server Action per crear una nova oportunitat o actualitzar-ne una d'existent.
 * S'executa de forma segura al servidor.
 * @param formData Les dades del formulari enviades des del client.
 * @returns Un objecte que conté un missatge d'error si n'hi ha.
 */
export async function saveOpportunityAction(
  formData: FormData
): Promise<{ error: { message: string } | null }> {
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificació de seguretat: assegurem que l'usuari està autenticat.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: 'Usuari no autenticat.' } };
  }

  // Obtenim l'ID per saber si estem creant o editant.
  const id = formData.get('id') as string | null;

  // Construïm l'objecte de dades a desar, extret del 'formData'.
  const dataToSave = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    contact_id: formData.get('contact_id') as string,
    stage_name: formData.get('stage_name') as string,
    value: parseFloat(formData.get('value') as string) || 0,
    // Gestionem correctament la data, que pot ser nul·la.
    close_date: formData.get('close_date') ? new Date(formData.get('close_date') as string).toISOString() : null,
  };

  // Validació bàsica de camps obligatoris.
  if (!dataToSave.name || !dataToSave.contact_id) {
    return { error: { message: 'El nom i el contacte són obligatoris.' } };
  }
  
  let error;
  // Si hi ha un ID, actualitzem ('update') el registre existent.
  if (id && id !== 'new') {
    ({ error } = await supabase.from('opportunities').update(dataToSave).eq('id', id));
  } else { // Si no, inserim ('insert') un nou registre.
    ({ error } = await supabase.from('opportunities').insert({ ...dataToSave, user_id: user.id }));
  }

  if (error) {
    console.error("Error en desar l'oportunitat:", error);
    return { error };
  }
  
  // Informem a Next.js que les dades de '/crm/pipeline' han canviat i que ha de refrescar la memòria cau.
  revalidatePath('/crm/pipeline');
  return { error: null }; // Retornem 'null' a l'error si tot ha anat bé.
}