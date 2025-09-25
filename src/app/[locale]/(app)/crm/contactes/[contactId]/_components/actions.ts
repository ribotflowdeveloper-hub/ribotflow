// /app/[locale]/crm/contactes/[contactId]/actions.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type Contact } from '@/types/crm';

export async function updateContactAction(
    contactId: string,
    formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: { message: "User not authenticated." } };
    }

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { data: null, error: { message: "No active team found." } };
    }

    // ✅ CORRECCIÓ: Processem el formData per obtenir les dades a actualitzar.
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

    // La consulta d'actualització ara utilitza correctament les dades del formulari.
    const { data, error } = await supabase
        .from('contacts')
        .update(dataToUpdate)
        .eq('id', contactId)
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


/**
 * @summary Deletes a contact from the database.
 */
export async function deleteContactAction(
    contactId: string
): Promise<{ success: boolean; message: string }> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { success: false, message: "No active team found." };
    }

    // You might want to delete related items first (optional)
    // await supabase.from('invoices').delete().eq('contact_id', contactId).eq('team_id', activeTeamId);

    // ✅ SECURE DELETE: We delete the contact by its ID AND the active team ID.
    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('team_id', activeTeamId); // <-- CRUCIAL SECURITY FILTER

    if (error) {
        console.error("Error deleting contact:", error);
        return { success: false, message: "Failed to delete contact." };
    }

    revalidatePath('/crm/contactes');
    return { success: true, message: "Contact deleted successfully." };
}