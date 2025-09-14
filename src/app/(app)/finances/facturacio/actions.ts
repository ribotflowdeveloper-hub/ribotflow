"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// Tipus per als conceptes que arriben del formulari
type InvoiceItemData = {
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
};

// Tipus complet per a les dades que envia el formulari
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

export async function createOrUpdateInvoiceAction(invoiceData: InvoiceFormData) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    // Separem les dades de la factura de les dades dels conceptes
    const { invoice_items, ...invoiceMainData } = invoiceData;
    const dataToUpsert = {
        ...invoiceMainData,
        user_id: user.id,
    };

    try {
        const { data: savedInvoice, error: invoiceError } = await supabase
            .from('invoices')
            .upsert(dataToUpsert)
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // Esborrem els conceptes antics associats a aquesta factura
        await supabase.from('invoice_items').delete().eq('invoice_id', savedInvoice.id);

        // Inserim els nous conceptes si n'hi ha
        if (invoice_items && invoice_items.length > 0) {
            const itemsToInsert = invoice_items.map(item => ({
                ...item,
                invoice_id: savedInvoice.id,
                user_id: user.id,
            }));
            const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;
        }
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: `Esborrany ${invoiceData.id ? 'actualitzat' : 'creat'} correctament.` };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ... (les teves altres accions com deleteInvoiceAction i issueInvoiceAction es queden igual) ...
/**
 * Acció per eliminar un esborrany de factura.
 */
export async function deleteInvoiceAction(invoiceId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    try {
        // Comprovació de seguretat: només es poden eliminar esborranys.
        const { data: existingInvoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).single();
        if (existingInvoice && existingInvoice.status !== 'Draft') {
            return { success: false, message: "Error: No es pot eliminar una factura que ja ha estat emesa." };
        }

        const { error } = await supabase.from('invoices').delete().match({ id: invoiceId, user_id: user.id });
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Esborrany eliminat." };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Acció que crida a l'Edge Function per emetre una factura legal.
 */
export async function issueInvoiceAction(draftInvoiceId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    try {
        const { data, error } = await supabase.functions.invoke('issue-verifactu-invoice', {
            body: { draft_invoice_id: draftInvoiceId, user_id: user.id },
        });

        if (error) throw new Error(error.message);

        revalidatePath('/finances/facturacio');
        return { success: true, message: "Factura emesa correctament.", invoice: data };

    } catch (error: any) {
        // Si l'error ve de la Edge Function, pot contenir un missatge més específic.
        const errorMessage = error.context?.errorMessage || error.message || "Error en connectar amb el servei de facturació.";
        return { success: false, message: errorMessage };
    }
}

