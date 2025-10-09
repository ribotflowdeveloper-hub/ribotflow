// In your quotes actions file

"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció

// ❌ The old getTeamId helper function is no longer needed and should be deleted.

/**
 * @summary Deletes a quote and its associated items.
 */
export async function deleteQuoteAction(quoteId: string) {
    // ✅ 2. Validació centralitzada
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    if (!quoteId) {
        return { success: false, message: "ID de pressupost invàlid." };
    }

    // This code is now secure. The RLS policies on both 'quote_items' and 'quotes'
    // will prevent a user from deleting data that doesn't belong to their active team.
    const { error: itemsError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId);

    if (itemsError) {
        console.error("Error deleting quote items:", itemsError);
        return { success: false, message: "Could not delete quote details." };
    }

    const { error: quoteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

    if (quoteError) {
        console.error("Error deleting quote:", quoteError);
        return { success: false, message: "Could not delete quote." };
    }

    revalidatePath('/crm/quotes');
    return { success: true, message: "Quote deleted successfully." };
}

