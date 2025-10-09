"use server";

import { revalidatePath } from "next/cache";
import type { Quote} from '@/types/crm';
import { validateUserSession } from "@/lib/supabase/session"; // ✅ Importem la nostra funció
import type { ActionResult} from '@/types/shared/index'; // Importa el nou tipus genèric
import type { TeamData, CompanyProfile } from '@/types/settings/team'; // Assegura't que TeamData està importat


/**
 * Desa (crea o actualitza) un pressupost i els seus conceptes.
 */
export async function saveQuoteAction(quoteData: Quote): Promise<ActionResult<string>> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase } = session;

    if (!quoteData.contact_id) return { success: false, message: "Si us plau, selecciona un client." };

    try {
        const { data, error } = await supabase.rpc('upsert_quote_with_items', {
            quote_payload: quoteData
        });

        // ✅ AFEGIM AQUEST BLOC PER A DEPURAR
        if (error) {
            // Això imprimirà l'error detallat de Supabase a la consola del teu servidor (el terminal on executes 'next dev')
            console.error("Supabase RPC Error:", JSON.stringify(error, null, 2));
            // Llançar l'error farà que el bloc 'catch' el capturi amb més detall
            throw error;
        }
        
        const finalQuoteId = data.quote_id;

        revalidatePath('/crm/quotes');
        revalidatePath(`/crm/quotes/${finalQuoteId}`);
        
        return { success: true, message: "Pressupost desat correctament.", data: finalQuoteId };

    } catch(error: unknown) { // ✅ Canviem 'error' a 'unknown' per accedir a les seves propietats de manera segura
        // Ara el missatge serà molt més específic
        const message = error instanceof Error ? error.message : "Error desconegut al desar el pressupost.";
        console.error("Error a saveQuoteAction:", message);
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
// ✅ CORRECCIÓ: Especifiquem que el 'data' de ActionResult serà de tipus 'TeamData'
export async function updateTeamProfileAction(
    teamData: Partial<CompanyProfile> | null
): Promise<ActionResult<TeamData>> { // <-- Aquí fem el canvi
    if (!teamData) {
        return { success: false, message: 'No s\'han proporcionat dades per actualitzar.' };
    }

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
        const { data, error } = await supabase
            .from('teams')
            .update(dataToUpdate)
            .eq('id', activeTeamId)
            .select()
            .single();
            
        if (error) throw error;
        
        revalidatePath(`/crm/quotes/[id]`, 'page');
        // Ara TypeScript sap que 'data' és de tipus TeamData, i el tipus de retorn és correcte.
        return { success: true, message: 'Perfil de l\'equip actualitzat.', data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error en actualitzar el perfil.";
        return { success: false, message };
    }
}

