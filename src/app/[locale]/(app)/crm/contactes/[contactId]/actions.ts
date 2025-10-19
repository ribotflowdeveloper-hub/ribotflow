"use server";

import { revalidatePath } from "next/cache";
import { type Database } from "@/types/supabase"; // Ja ho tens
import { validateUserSession } from "@/lib/supabase/session"; // Ja ho tens

// --- Tipus ---

// Tipus base de la fila
type ContactRow = Database['public']['Tables']['contacts']['Row'];

// ✅ NOU: Tipus de detall que inclou el proveïdor (pel JOIN)
export type ContactDetail = Omit<ContactRow, 'suppliers'> & {
  suppliers: Database['public']['Tables']['suppliers']['Row'] | null;
};

// --- Accions ---

/**
 * ✅ NOVA FUNCIÓ
 * Obté el detall d'un contacte, incloent l'empresa (supplier) associada.
 */
export async function fetchContactDetail(contactId: number): Promise<ContactDetail | null> {
  const session = await validateUserSession();
  if ("error" in session) return null;
  const { supabase, activeTeamId } = session;

  const { data, error } = await supabase
    .from("contacts")
    // Aquí fem el JOIN per obtenir el 'nom' del proveïdor
    .select(`
      *, 
      suppliers (id, nom)
    `)
    .eq("id", contactId)
    .eq("team_id", activeTeamId)
    .single();

  if (error) {
    console.error("Error fetching contact detail:", error.message);
    return null;
  }
  
  // Fem un 'cast' al nostre nou tipus
  return data as unknown as ContactDetail;
}


/**
 * ✅ ACCIÓ MODIFICADA
 * Actualitza un contacte a partir de FormData.
 */
export async function updateContactAction(
    contactId: number, 
    formData: FormData
): Promise<{ data: ContactDetail | null; error: { message: string } | null }> {
    const session = await validateUserSession();
    if ('error' in session) return { data: null, error: session.error };
    const { supabase, activeTeamId } = session;

    const hobbiesValue = formData.get('hobbies') as string;
    
    // ✅ CANVI: Llegim 'supplier_id' i el posem a null si està buit.
    const supplierId = formData.get('supplier_id') as string;

    const dataToUpdate = {
        nom: formData.get('nom') as string,
        // ❌ 'empresa' HA DESAPAREGUT
        supplier_id: supplierId || null, // ✅ 'supplier_id' ÉS LA NOVA CLAU
        email: formData.get('email') as string,
        telefon: formData.get('telefon') as string,
        estat: formData.get('estat') as string,
        job_title: formData.get('job_title') as string,
        industry: formData.get('industry') as string,
        lead_source: formData.get('lead_source') as string,
        birthday: formData.get('birthday') || null,
        notes: formData.get('notes') as string,
        children_count: formData.get('children_count') ? parseInt(formData.get('children_count') as string, 10) : null,
        partner_name: formData.get('partner_name') as string,
        hobbies: hobbiesValue ? hobbiesValue.split(',').map(item => item.trim()) : [],
        address: {
            city: formData.get('address.city') as string,
        },
        social_media: {
            linkedin: formData.get('social_media.linkedin') as string,
        }
    };

    const { data, error } = await supabase
        .from('contacts')
        .update(dataToUpdate)
        .eq('id', contactId)
        .eq('team_id', activeTeamId)
        .select(`
          *, 
          suppliers (id, nom)
        `) // ✅ Retornem les dades amb el JOIN
        .single();

    if (error) {
        console.error("Error updating contact:", error);
        return { data: null, error: { message: error.message } };
    }

    revalidatePath(`/crm/contactes/${contactId}`);
    return { data: data as unknown as ContactDetail, error: null };
}

// ✅ Aquesta funció es queda igual
export async function deleteContactAction(
    contactId: number
): Promise<{ success: boolean; message: string }> {
   const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('team_id', activeTeamId);

    if (error) {
        console.error("Error deleting contact:", error);
        return { success: false, message: "No s'ha pogut eliminar el contacte." };
    }

    revalidatePath('/crm/contactes');
    return { success: true, message: "Contacte eliminat correctament." };
}