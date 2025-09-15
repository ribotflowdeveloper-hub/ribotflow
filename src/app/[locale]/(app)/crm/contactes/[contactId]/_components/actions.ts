/**
 * @file actions.ts (Detall de Contacte)
 * @summary Aquest fitxer conté les Server Actions específiques per a la pàgina de detall d'un contacte.
 * Aquestes funcions s'executen de manera segura al servidor i gestionen l'actualització i eliminació
 * d'un contacte individual a la base de dades.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type Contact } from '@/types/crm'; // Importem el tipus centralitzat de Contacte.

/**
 * @summary Actualitza les dades d'un contacte existent a la base de dades.
 * @param {string} contactId - L'ID del contacte que es vol actualitzar.
 * @param {FormData} formData - L'objecte FormData que conté totes les dades del formulari d'edició.
 * @returns {Promise<{ data: Contact | null; error: { message: string } | null }>} L'objecte del contacte actualitzat o un missatge d'error.
 */
export async function updateContactAction(
  contactId: string,
  formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Usuari no autenticat." } };
  }

  // Recopilem i processem totes les dades rebudes del formulari.
  // El FormData ens permet enviar formularis complexos des del client al servidor de manera eficient.
  const hobbiesValue = formData.get('hobbies') as string;
  const dataToUpdate = {
    nom: formData.get('nom') as string,
    empresa: formData.get('empresa') as string,
    email: formData.get('email') as string,
    telefon: formData.get('telefon') as string,
    estat: formData.get('estat') as string,
    job_title: formData.get('job_title') as string,
    industry: formData.get('industry') as string,
    lead_source: formData.get('lead_source') as string,
    birthday: formData.get('birthday') || null, // Gestionem el cas on la data pugui ser buida.
    notes: formData.get('notes') as string,
    children_count: formData.get('children_count') ? parseInt(formData.get('children_count') as string, 10) : null,
    partner_name: formData.get('partner_name') as string,
    // Per als hobbies, convertim el text separat per comes en un array de strings.
    hobbies: hobbiesValue ? hobbiesValue.split(',').map(item => item.trim()) : [],
    // Supabase gestiona nativament els objectes JSON per a columnes de tipus 'jsonb'.
    address: {
        city: formData.get('address.city') as string,
    },
    social_media: {
        linkedin: formData.get('social_media.linkedin') as string,
    }
  };

  // Executem l'operació d'actualització a la base de dades.
  const { data, error } = await supabase
    .from('contacts')
    .update(dataToUpdate)
    .eq('id', contactId)
    .select()
    .single();

  if (error) {
    console.error("Error en actualitzar el contacte:", error);
    return { data: null, error: { message: error.message } };
  }

  // Revalidem la ruta específica d'aquest contacte. Això farà que la propera vegada
  // que es visiti, les dades es carreguin de nou des del servidor, mostrant els canvis.
  revalidatePath(`/crm/contactes/${contactId}`);
  return { data, error: null };
}

/**
 * @summary Elimina un contacte de la base de dades.
 * @param {string} contactId - L'ID del contacte a eliminar.
 * @returns {Promise<{ success: boolean; message: string }>} Un objecte indicant l'èxit de l'operació.
 */
export async function deleteContactAction(
  contactId: string
): Promise<{ success: boolean; message: string }> {
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  // Bona pràctica (opcional): Abans d'eliminar un contacte, es podrien eliminar
  // o desvincular tots els registres relacionats (factures, pressupostos, etc.)
  // per mantenir la integritat de les dades.
  // await supabase.from('invoices').delete().eq('contact_id', contactId);
  // await supabase.from('quotes').delete().eq('contact_id', contactId);

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId);

  if (error) {
    console.error("Error deleting contact:", error);
    return { success: false, message: "Failed to delete contact." };
  }

  // Després d'eliminar, revalidem la pàgina principal de contactes,
  // ja que l'usuari serà redirigit allà i la llista ha d'estar actualitzada.
  revalidatePath('/crm/contactes');
  return { success: true, message: "Contact deleted successfully." };
}
