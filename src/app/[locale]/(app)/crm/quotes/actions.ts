"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { QuoteWithContact } from "./page";

// Funció auxiliar per obtenir el team_id de l'usuari de manera reutilitzable
import { SupabaseClient } from "@supabase/supabase-js";

async function getTeamId(supabase: SupabaseClient, userId: string): Promise<string | null> {
    const { data: member } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single();
    return member?.team_id || null;
}

/**
 * @summary Elimina un pressupost i tots els seus ítems associats de la base de dades.
 * @param {string} quoteId - L'ID del pressupost que es vol eliminar.
 * @returns {Promise<{ success: boolean; message: string }>} Un objecte indicant l'èxit de l'operació.
 */
export async function deleteQuoteAction(quoteId: string) {
    if (!quoteId) {
        return { success: false, message: "L'ID del pressupost és invàlid." };
    }
    
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }

    // Pas 1: Esborrar els ítems associats al pressupost.
    // La seguretat la garantirà la RLS, que impedirà esborrar ítems d'un altre equip.
    const { error: itemsError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId);
        
    if (itemsError) {
        console.error("Error en esborrar els ítems del pressupost:", itemsError);
        return { success: false, message: "No s'han pogut esborrar els detalls del pressupost." };
    }

    // Pas 2: Esborrar el pressupost principal.
    const { error: quoteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

    if (quoteError) {
        console.error("Error en esborrar el pressupost:", quoteError);
        return { success: false, message: "No s'ha pogut esborrar el pressupost." };
    }

    revalidatePath('/crm/quotes');
    return { success: true, message: "Pressupost esborrat correctament." };
}

/**
 * @summary Obté els pressupostos de l'equip, ordenats segons els paràmetres rebuts.
 * @param {object} sortState - Un objecte que defineix la columna i la direcció de l'ordenació.
 * @returns {Promise<{ success: boolean; data?: QuoteWithContact[]; message?: string }>} Un objecte amb les dades ordenades o un missatge d'error.
 */
export async function sortQuotesAction(
    sortState: { [key: string]: 'asc' | 'desc' }
): Promise<{ success: boolean; data?: QuoteWithContact[]; message?: string }> {
    try {
        const supabase = createClient(cookies());
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuari no autenticat.");

        const teamId = await getTeamId(supabase, user.id);
        if (!teamId) {
            return { success: false, message: "No s'ha pogut trobar l'equip." };
        }

        let query = supabase
            .from('quotes')
            .select('*, contacts(nom, empresa)')
            .eq('team_id', teamId); // ✅ Filtrem per l'ID de l'equip
        
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
        const message = error instanceof Error ? error.message : "Error desconegut";
        console.error("Error a sortQuotesAction:", message);
        return { success: false, message };
    }
}

