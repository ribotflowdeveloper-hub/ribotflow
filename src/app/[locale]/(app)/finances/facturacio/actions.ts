"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// Funció d'ajuda per obtenir el team_id (per no repetir codi)
import { SupabaseClient } from "@supabase/supabase-js";

async function getTeamId(supabase: SupabaseClient, userId: string): Promise<string | null> {
    const { data: member } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single();
    return member?.team_id || null;
}

// Tipus de dades que rebem del formulari del client
type InvoiceItemData = {
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
    product_id?: string | null;
    tax_rate?: number | null;
};

export type InvoiceFormData = {
    id?: string | null;
    contact_id: string;
    issue_date: string;
    due_date: string | null;
    status: 'Draft';
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    notes: string | null;
    invoice_items: InvoiceItemData[];
};

/**
 * ✅ VERSIÓ CORREGIDA I ROBUSTA
 * Crea o actualitza una factura i els seus ítems, assignant-los a l'equip correcte.
 */
export async function createOrUpdateInvoiceAction(invoiceData: InvoiceFormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    const teamId = await getTeamId(supabase, user.id);
    if (!teamId) return { success: false, message: "No s'ha pogut determinar l'equip." };
    
    try {
        let savedInvoiceId: string;
        const { invoice_items, id, ...invoiceFields } = invoiceData;

        // Si tenim un ID, actualitzem una factura existent.
        if (id) {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({ ...invoiceFields, user_id: user.id, team_id: teamId })
                .eq('id', id)
                .eq('team_id', teamId); // Assegurem que només actualitzem factures del nostre equip

            if (updateError) throw updateError;
            savedInvoiceId = id;
        } else {
            // Si no tenim ID, creem una factura nova.
            const { data: newInvoice, error: insertError } = await supabase
                .from('invoices')
                .insert({ ...invoiceFields, user_id: user.id, team_id: teamId })
                .select('id')
                .single();

            if (insertError || !newInvoice) throw insertError || new Error("No s'ha pogut crear la factura i obtenir-ne l'ID.");
            savedInvoiceId = newInvoice.id;
        }

        // Un cop tenim un ID garantit, gestionem els ítems.
        // Primer esborrem els antics per evitar duplicats.
        await supabase.from('invoice_items').delete().eq('invoice_id', savedInvoiceId);

        if (invoice_items && invoice_items.length > 0) {
            const itemsToInsert = invoice_items.map(item => ({
                ...item,
                invoice_id: savedInvoiceId,
                user_id: user.id,
                team_id: teamId,
            }));
            const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;
        }
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: `Esborrany ${id ? 'actualitzat' : 'creat'} correctament.` };
    
    } catch (error) {
        // Afegim un console.error per poder depurar millor des del servidor si torna a passar.
        console.error("Error detallat en createOrUpdateInvoiceAction:", error);
        const message = error instanceof Error ? error.message : "Error desconegut en desar la factura.";
        return { success: false, message };
    }
}

/**
 * Elimina un esborrany de factura, verificant que pertanyi a l'equip.
 */
export async function deleteInvoiceAction(invoiceId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    const teamId = await getTeamId(supabase, user.id);
    if (!teamId) return { success: false, message: "No s'ha pogut determinar l'equip." };

    try {
        const { data: existingInvoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).eq('team_id', teamId).single();
        if (!existingInvoice) return { success: false, message: "La factura no existeix o no tens permisos." };
        if (existingInvoice.status !== 'Draft') return { success: false, message: "No es pot eliminar una factura que ja ha estat emesa." };

        const { error } = await supabase.from('invoices').delete().match({ id: invoiceId, team_id: teamId });
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Esborrany eliminat." };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
    }
}

/**
 * Emet una factura legal, verificant que pertanyi a l'equip.
 */
export async function issueInvoiceAction(draftInvoiceId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    const teamId = await getTeamId(supabase, user.id);
    if (!teamId) return { success: false, message: "No s'ha pogut determinar l'equip." };

    const { data: invoiceToIssue } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', draftInvoiceId)
        .eq('team_id', teamId)
        .single();
    
    if (!invoiceToIssue) return { success: false, message: "No tens permís per emetre aquesta factura." };

    try {
        const { data, error } = await supabase.functions.invoke('issue-verifactu-invoice', {
            body: { draft_invoice_id: draftInvoiceId, user_id: user.id },
        });

        if (error) throw error;

        revalidatePath('/finances/facturacio');
        return { success: true, message: "Factura emesa correctament.", invoice: data };
    } catch (error) {
        const typedError = error as (Error & { context?: { errorMessage?: string } });
        const errorMessage = typedError.context?.errorMessage || typedError.message;
        return { success: false, message: errorMessage };
    }
}

