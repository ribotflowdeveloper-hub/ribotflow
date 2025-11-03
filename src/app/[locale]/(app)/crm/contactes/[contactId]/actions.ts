// src/app/[locale]/(app)/crm/contactes/[contactId]/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";

// ✅ 1. Importem el servei
import * as contactService from "@/lib/services/crm/contacts/contacts.service";
// ✅ 2. Importem el tipus de detall des del servei
import type { ContactDetail } from "@/lib/services/crm/contacts/contacts.service";

// ❌ 3. ELIMINEM LA RE-EXPORTACIÓ DEL TIPUS
// export type { ContactDetail }; // <--- AQUESTA LÍNIA CAUSA EL REFERENCE ERROR

/**
 * ACCIÓ: Actualitza un contacte a partir de FormData.
 */
export async function updateContactAction(
    contactId: number, 
    formData: FormData
): Promise<{ data: ContactDetail | null; error: { message: string } | null }> {
    // 1. Validació de sessió
    const session = await validateUserSession();
    if ('error' in session) return { data: null, error: session.error };
    const { supabase, activeTeamId } = session;

    try {
        // 2. Cridem al servei
        const data = await contactService.updateContact(
            supabase,
            contactId,
            activeTeamId,
            formData
        );

        // 3. Efecte secundari
        revalidatePath(`/crm/contactes/${contactId}`);
        return { data, error: null };

    } catch (error: unknown) {
        // 4. Gestió d'errors
        const message = (error as Error).message;
        console.error("Error updating contact (action):", message);
        return { data: null, error: { message } };
    }
}

/**
 * ACCIÓ: Elimina un contacte.
 */
export async function deleteContactAction(
    contactId: number
): Promise<{ success: boolean; message: string }> {
   // 1. Validació de sessió
   const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    try {
        // 2. Cridem al servei
        await contactService.deleteContact(supabase, contactId, activeTeamId);

        // 3. Efecte secundari
        revalidatePath('/crm/contactes');
        return { success: true, message: "Contacte eliminat correctament." };

    } catch (error: unknown) {
        // 4. Gestió d'errors
        const message = (error as Error).message;
        console.error("Error deleting contact (action):", message);
        return { success: false, message };
    }
}