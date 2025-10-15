// /app/[locale]/crm/contactes/[contactId]/actions.ts (CORREGIT)

"use server";

import { revalidatePath } from "next/cache";
// ✅ 1. Importem la definició de la base de dades.
import { type Database } from "@/types/supabase";
import { validateUserSession } from "@/lib/supabase/session";

// ✅ 2. Definim el tipus a partir de la BD.
type Contact = Database['public']['Tables']['contacts']['Row'];

export async function updateContactAction(
    // ✅ 3. L'ID del contacte és un NÚMERO.
    contactId: number, 
    formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {
    const session = await validateUserSession();
    if ('error' in session) return { data: null, error: session.error };
    const { supabase, activeTeamId } = session;

    // El processament del formulari estava correcte.
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
        .eq('id', contactId) // La comparació ara és number === number.
        .eq('team_id', activeTeamId)
        .select()
        .single();

    if (error) {
        console.error("Error updating contact:", error);
        return { data: null, error: { message: error.message } };
    }

    revalidatePath(`/crm/contactes/${contactId}`);
    return { data, error: null };
}

export async function deleteContactAction(
    // ✅ 4. L'ID del contacte és un NÚMERO.
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
        .eq('id', contactId) // La comparació ara és number === number.
        .eq('team_id', activeTeamId);

    if (error) {
        console.error("Error deleting contact:", error);
        return { success: false, message: "No s'ha pogut eliminar el contacte." };
    }

    revalidatePath('/crm/contactes');
    return { success: true, message: "Contacte eliminat correctament." };
}