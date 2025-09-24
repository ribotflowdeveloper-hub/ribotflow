"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// El tipus de dades que rebem del formulari del client
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
 * Crea o actualitza una factura. La política RLS de la base de dades
 * s'encarregarà de verificar que l'operació pertany a l'equip actiu.
 */
export async function createOrUpdateInvoiceAction(invoiceData: InvoiceFormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    // ✅ Obtenim l'equip actiu directament del token de l'usuari
    const teamId = user.app_metadata?.active_team_id;
    if (!teamId) return { success: false, message: "No s'ha pogut determinar l'equip actiu." };
    
    try {
        let savedInvoiceId: string;
        const { invoice_items, id, ...invoiceFields } = invoiceData;

        if (id) {
            // En actualitzar, la política RLS 'WITH CHECK' verificarà el team_id automàticament
            const { error: updateError } = await supabase
                .from('invoices')
                .update({ ...invoiceFields, user_id: user.id, team_id: teamId })
                .eq('id', id);
            if (updateError) throw updateError;
            savedInvoiceId = id;
        } else {
            // En crear, afegim el team_id actiu. La RLS 'WITH CHECK' ho validarà.
            const { data: newInvoice, error: insertError } = await supabase
                .from('invoices')
                .insert({ ...invoiceFields, user_id: user.id, team_id: teamId })
                .select('id')
                .single();
            if (insertError || !newInvoice) throw insertError || new Error("No s'ha pogut crear la factura.");
            savedInvoiceId = newInvoice.id;
        }

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
        const message = error instanceof Error ? error.message : "Error desconegut en desar la factura.";
        return { success: false, message };
    }
}

/**
 * Elimina un esborrany de factura. La RLS s'encarregarà de la seguretat.
 */
export async function deleteInvoiceAction(invoiceId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    try {
        // La RLS impedirà que s'esborri una factura d'un altre equip
        const { data: existingInvoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).single();
        if (existingInvoice && existingInvoice.status !== 'Draft') {
            return { success: false, message: "Error: No es pot eliminar una factura que ja ha estat emesa." };
        }

        const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Esborrany eliminat." };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
    }
}

/**
 * Emet una factura legal (Veri*factu). La RLS s'encarregarà de la seguretat.
 */
export async function issueInvoiceAction(draftInvoiceId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    // La RLS ja s'haurà assegurat que l'usuari té accés a aquesta factura
    // abans de cridar l'acció, per la qual cosa no cal una doble comprovació aquí.
    try {
        const { data, error } = await supabase.functions.invoke('issue-verifactu-invoice', {
            body: { draft_invoice_id: draftInvoiceId, user_id: user.id },
        });

        if (error) throw (error);

        revalidatePath('/finances/facturacio');
        return { success: true, message: "Factura emesa correctament.", invoice: data };
    } catch (error) {
        const typedError = error as (Error & { context?: { errorMessage?: string } });
        const errorMessage = typedError.context?.errorMessage || typedError.message;
        return { success: false, message: errorMessage };
    }
}