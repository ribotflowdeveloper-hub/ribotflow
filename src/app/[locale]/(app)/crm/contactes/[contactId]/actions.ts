// src/app/[locale]/(app)/crm/contactes/[contactId]/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { 
  PERMISSIONS, 
  validateSessionAndPermission 
} from "@/lib/permissions/permissions";
import * as contactService from "@/lib/services/crm/contacts/contacts.service";
import type { ContactDetail } from "@/lib/services/crm/contacts/contacts.service";
import type { ActionResult } from "@/types/shared/actionResult";

// ⚠️ NO exportis tipus des d'aquí. Importa'ls directament del servei on calgui.

export async function updateContactAction(
    contactId: number, 
    formData: FormData
): Promise<ActionResult<ContactDetail>> {
    // 1. Validació de permisos (Editar necessita MANAGE)
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_CONTACTS);
    if ("error" in session) return { success: false, message: session.error.message };

    const { supabase, activeTeamId } = session;

    try {
        const data = await contactService.updateContact(
            supabase,
            contactId,
            activeTeamId,
            formData
        );

        revalidatePath(`/crm/contactes/${contactId}`);
        revalidatePath('/crm/contactes'); // Actualitzem la llista també
        
        return { success: true, message: "Contacte actualitzat.", data };
    } catch (error) {
        console.error("Error updateContactAction:", error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "Error actualitzant el contacte" 
        };
    }
}

export async function deleteContactAction(
    contactId: number
): Promise<ActionResult<void>> {
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_CONTACTS);
    if ("error" in session) return { success: false, message: session.error.message };

    try {
        await contactService.deleteContact(session.supabase, contactId, session.activeTeamId);

        revalidatePath('/crm/contactes');
        return { success: true, message: "Contacte eliminat correctament." };
    } catch (error) {
        console.error("Error deleteContactAction:", error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "Error eliminant el contacte" 
        };
    }
}