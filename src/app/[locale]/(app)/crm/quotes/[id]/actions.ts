"use server";
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Quote} from '@/types/crm';
import type { CompanyProfile } from '@/types/settings/team'; // Importa els nous tipus

/**
 * Server Action per desar (crear o actualitzar) un pressupost i els seus conceptes.
 */
export async function saveQuoteAction(quoteData: Quote) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    // --- NOVA LÒGICA D'EQUIP ACTIU ---
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return { success: false, message: "No s'ha pogut determinar l'equip actiu." };

    if (!quoteData.contact_id) return { success: false, message: "Si us plau, selecciona un client." };

    const { items, id, ...quoteFields } = quoteData;
    let finalQuoteId = id;

    try {
        if (id === 'new') {
            const { data: newQuote, error } = await supabase
                .from('quotes')
                .insert({ ...quoteFields, user_id: user.id, team_id: activeTeamId }) // ✅ Afegim team_id
                .select('id')
                .single();
            if (error || !newQuote) throw error || new Error("No s'ha pogut crear el pressupost.");
            finalQuoteId = newQuote.id;
        } else {
            // La RLS verificarà que tenim permís per actualitzar aquest pressupost
            await supabase.from('quotes').update(quoteFields).eq('id', id);
            await supabase.from('quote_items').delete().eq('quote_id', id);
        }

        if (items?.length) {
            const itemsToInsert = items.map(item => ({
                quote_id: finalQuoteId,
                user_id: user.id, // <-- CORREGIT
                team_id: activeTeamId, // ✅ Afegim team_id
                product_id: item.product_id || null,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
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
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
    }
}

/**
 * Server Action per eliminar un pressupost.
 */
export async function deleteQuoteAction(quoteId: string) {
    if (!quoteId || quoteId === 'new') return { success: false, message: "ID invàlid." };
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    // ✅ Eliminem .eq('user_id', userId). La RLS s'encarregarà de la seguretat.
    try {
        await supabase.from('quote_items').delete().eq('quote_id', quoteId);
        await supabase.from('quotes').delete().eq('id', quoteId);

        revalidatePath('/crm/quotes');
        return { success: true, message: "Pressupost eliminat." };
    } catch(error) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
    }
}

/**
 * Acció per crear un nou producte desable.
 */
export async function createProductAction(newProduct: { name: string, price: number }) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    // --- NOVA LÒGICA D'EQUIP ACTIU ---
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return { success: false, message: "No s'ha pogut determinar l'equip actiu." };

    try {
        const { data, error } = await supabase.from('products').insert({
            user_id: user.id,
            team_id: activeTeamId, // ✅ Afegim team_id
            name: newProduct.name,
            price: newProduct.price,
        }).select().single();

        if (error) throw error;

        // Revalidem el layout per assegurar que les dades es refresquen a tot arreu
        revalidatePath(`/crm`, 'layout');
        return { success: true, message: 'Nou producte desat.', newProduct: data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
    }
}

// --- ACCIONS DE PRESSUPOSTOS ---




/**
 * Server Action per iniciar el procés d'enviament d'un pressupost en PDF.
 * Aquesta acció fa de pont segur cap a una Edge Function que s'encarrega de la feina pesada.
 * @param quoteId L'ID del pressupost a enviar.
 */
export async function sendQuoteAction(quoteId: string) {
  if (!quoteId) return { success: false, message: "ID de pressupost invàlid." };
  

  const supabase = createClient(cookies())
;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuari no autenticat." };

  try {
    // La pujada del PDF es fa al client. Aquesta acció només crida la funció
    // 'send-quote-pdf' que s'encarregarà d'enviar el correu des del servidor.
    const { error: functionError } = await supabase.functions.invoke('send-quote-pdf', { body: { quoteId } });
    if (functionError) throw functionError;
    
    revalidatePath(`/crm/quotes/${quoteId}`);
    return { success: true, message: "S'ha iniciat l'enviament del pressupost." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

// --- ACCIONS DE SUB-COMPONENTS ---
/**
 * Acció per actualitzar el perfil de l'empresa de l'usuari.
 */
export async function updateTeamProfileAction(teamData: Partial<CompanyProfile>) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "User not authenticated." };

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return { success: false, message: "No active team found." };

    // Prepare data for the 'teams' table
    const dataToUpdate = {
        name: teamData.company_name,
        tax_id: teamData.company_tax_id,
        address: teamData.company_address,
        email: teamData.company_email,
        phone: teamData.company_phone,
        logo_url: teamData.logo_url,
    };

    try {
        const { data, error } = await supabase
            .from('teams')
            .update(dataToUpdate)
            .eq('id', activeTeamId) // Securely update only the active team
            .select()
            .single();
        
        if (error) throw error;
        
        revalidatePath(`/crm/quotes/[id]`, 'page');
        
        return { success: true, message: 'Team profile updated.', updatedProfile: data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { success: false, message };
    }
}