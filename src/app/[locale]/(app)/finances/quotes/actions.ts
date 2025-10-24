// /app/[locale]/(app)/crm/quotes/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
// ✅ Importació dels tipus de Supabase per al tipus de l'ID
import type { Database } from '@/types/supabase';

// -------------------------------------------------------------
// ✅ TIPUS DE L'ID (Assumint number per bigint)
// -------------------------------------------------------------
type QuoteId = Database['public']['Tables']['quotes']['Row']['id'];

/**
 * @summary Deletes a quote and its associated items.
 */
// ✅ L'argument 'quoteId' ara té el tipus de Supabase (QuoteId, que és number).
export async function deleteQuoteAction(quoteId: QuoteId) {
    const session = await validateUserSession();
    if ('error' in session) {
        // Retornem un tipus d'error ben definit per a Next.js Server Actions
        return { success: false as const, message: session.error.message };
    }
    const { supabase } = session;

    if (!quoteId) {
        return { success: false as const, message: "ID de pressupost invàlid." };
    }

    // -------------------------------------------------------------
    // ✅ SEGURETAT DE TIPUS EN LA CONSULTA
    // -------------------------------------------------------------
    // La lògica de seguretat RLS ja protegeix aquestes operacions.
    const { error: itemsError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId); // ✅ 'number' === 'number'.

    if (itemsError) {
        console.error("Error deleting quote items:", itemsError);
        return { success: false as const, message: "No s'han pogut eliminar els detalls del pressupost." };
    }

    const { error: quoteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId); // ✅ 'number' === 'number'.

    if (quoteError) {
        console.error("Error deleting quote:", quoteError);
        return { success: false as const, message: "No s'ha pogut eliminar el pressupost." };
    }

    revalidatePath('/crm/quotes');
    return { success: true as const, message: "Pressupost eliminat correctament." };
}