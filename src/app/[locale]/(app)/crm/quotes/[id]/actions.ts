"use server";

import { revalidatePath } from "next/cache";
import type { Quote, CompanyProfile } from '@/types/crm';
import { validateUserSession } from "@/lib/supabase/session"; // ✅ Importem la nostra funció

// Definim un tipus de retorn més consistent per a les accions
type ActionResult<T = unknown> = {
    success: boolean;
    message: string;
    data?: T;
};

/**
 * Desa (crea o actualitza) un pressupost i els seus conceptes.
 */
export async function saveQuoteAction(quoteData: Quote): Promise<ActionResult<string>> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    if (!quoteData.contact_id) return { success: false, message: "Si us plau, selecciona un client." };

    const { items, id, ...quoteFields } = quoteData;
    let finalQuoteId = id;

    try {
        if (id === 'new') {
            const { data: newQuote, error } = await supabase.from('quotes').insert({ ...quoteFields, user_id: user.id, team_id: activeTeamId }).select('id').single();
            if (error || !newQuote) throw error || new Error("No s'ha pogut crear el pressupost.");
            finalQuoteId = newQuote.id;
        } else {
            // La RLS verificarà que tenim permís per actualitzar
            await supabase.from('quotes').update(quoteFields).eq('id', id);
            await supabase.from('quote_items').delete().eq('quote_id', id);
        }

        if (items?.length) {
            const itemsToInsert = items.map(item => ({
                quote_id: finalQuoteId, user_id: user.id, team_id: activeTeamId,
                product_id: item.product_id || null, description: item.description,
                quantity: item.quantity, unit_price: item.unit_price,
                total: (item.quantity || 0) * (item.unit_price || 0),
            }));
            await supabase.from('quote_items').insert(itemsToInsert);
        }

        if (quoteFields.opportunity_id) {
            await supabase.from('opportunities').update({ stage_name: 'Proposta Enviada' }).eq('id', quoteFields.opportunity_id);
        }

        revalidatePath('/crm/quotes');
        revalidatePath(`/crm/quotes/${finalQuoteId}`);
        return { success: true, message: "Pressupost desat correctament.", data: finalQuoteId };

    } catch(error) {
        const message = error instanceof Error ? error.message : "Error desconegut al desar el pressupost.";
        return { success: false, message };
    }
}

/**
 * Elimina un pressupost.
 */
export async function deleteQuoteAction(quoteId: string): Promise<ActionResult> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase } = session;

    if (!quoteId || quoteId === 'new') return { success: false, message: "ID invàlid." };
    
    try {
        // La RLS s'encarregarà de la seguretat a nivell de fila
        await supabase.from('quote_items').delete().eq('quote_id', quoteId);
        await supabase.from('quotes').delete().eq('id', quoteId);
        revalidatePath('/crm/quotes');
        return { success: true, message: "Pressupost eliminat." };
    } catch(error) {
        const message = error instanceof Error ? error.message : "Error en eliminar el pressupost.";
        return { success: false, message };
    }
}

/**
 * Acció per crear un nou producte desable.
 */
export async function createProductAction(newProduct: { name: string, price: number }): Promise<ActionResult> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    try {
        const { data, error } = await supabase.from('products').insert({
            user_id: user.id, team_id: activeTeamId,
            name: newProduct.name, price: newProduct.price,
        }).select().single();

        if (error) throw error;
        revalidatePath(`/crm`, 'layout');
        return { success: true, message: 'Nou producte desat.', data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error en crear el producte.";
        return { success: false, message };
    }
}

/**
 * Acció segura que invoca l'Edge Function 'send-quote-pdf'.
 */
export async function sendQuoteAction(quoteId: string): Promise<ActionResult> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase } = session;

    if (!quoteId) return { success: false, message: "ID de pressupost invàlid." };
    
    try {
        const { error } = await supabase.functions.invoke('send-quote-pdf', { body: { quoteId } });
        if (error) throw error;
        revalidatePath(`/crm/quotes/${quoteId}`);
        return { success: true, message: "S'ha iniciat l'enviament del pressupost." };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error en invocar l'Edge Function.";
        return { success: false, message };
    }
}

/**
 * Acció per actualitzar el perfil de l'empresa de l'equip.
 */
export async function updateTeamProfileAction(teamData: Partial<CompanyProfile>): Promise<ActionResult> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    const dataToUpdate = {
        name: teamData.company_name,
        tax_id: teamData.company_tax_id,
        address: teamData.company_address,
        email: teamData.company_email,
        phone: teamData.company_phone,
        logo_url: teamData.logo_url,
    };

    try {
        const { data, error } = await supabase.from('teams').update(dataToUpdate).eq('id', activeTeamId).select().single();
        if (error) throw error;
        
        revalidatePath(`/crm/quotes/[id]`, 'page');
        return { success: true, message: 'Perfil de l\'equip actualitzat.', data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error en actualitzar el perfil.";
        return { success: false, message };
    }
}