// In your quotes actions file

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { QuoteWithContact } from "./page";

// ❌ The old getTeamId helper function is no longer needed and should be deleted.

/**
 * @summary Deletes a quote and its associated items.
 */
export async function deleteQuoteAction(quoteId: string) {
    if (!quoteId) {
        return { success: false, message: "Invalid quote ID." };
    }
    
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "User not authenticated." };
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

/**
 * @summary Gets quotes for the team, sorted by the given parameters.
 */
export async function sortQuotesAction(
    sortState: { [key: string]: 'asc' | 'desc' }
): Promise<{ success: boolean; data?: QuoteWithContact[]; message?: string }> {
    try {
        const supabase = createClient(cookies());
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");

        // --- NEW, CORRECT TEAM LOGIC ---
        // We get the active team ID directly from the user's session.
        const activeTeamId = user.app_metadata?.active_team_id;
        if (!activeTeamId) {
            return { success: false, message: "Could not find an active team." };
        }
        // ---------------------------------

        let query = supabase
            .from('quotes')
            .select('*, contacts(nom, empresa)');
        
        // ✅ The manual '.eq('team_id', teamId)' is no longer needed due to RLS.

        // Sorting logic remains the same.
        // ... (your existing for-loop for sorting is fine)
        const sortCriteria = Object.entries(sortState);
        if (sortCriteria.length > 0) {
            for (const [column, order] of sortCriteria) {
                const ascending = order === 'asc';
                if (column.includes('.')) {
                    const [referencedTable, referencedColumn] = column.split('.');
                    query = query.order(referencedColumn, { referencedTable, ascending });
                } else {
                    query = query.order(column, { ascending });
                }
            }
        } else {
            query = query.order('issue_date', { ascending: false });
        }

        const { data: quotes, error } = await query;
        if (error) throw error;
        
        return { success: true, data: quotes as QuoteWithContact[] };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error in sortQuotesAction:", message);
        return { success: false, message };
    }
}