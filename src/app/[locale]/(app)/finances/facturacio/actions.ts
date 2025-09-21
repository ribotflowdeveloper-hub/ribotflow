"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

type InvoiceItemData = {
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
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

export async function createOrUpdateInvoiceAction(invoiceData: InvoiceFormData) {
    const cookieStore = cookies();
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    const { invoice_items, ...invoiceMainData } = invoiceData;
    const dataToUpsert = {
        ...invoiceMainData,
        user_id: user.id,
    };

    try {
        const { data: savedInvoice, error: invoiceError } = await supabase
            .from('invoices')
            .upsert(dataToUpsert)
            .select('id') // Demanem només l'ID per eficiència
            .single();

        if (invoiceError) throw invoiceError;

        await supabase.from('invoice_items').delete().eq('invoice_id', savedInvoice.id);

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
    } catch (error) {
        // ✅ CORRECCIÓ: Gestió d'errors segura
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: "Ha ocorregut un error inesperat." };
    }
}

export async function deleteInvoiceAction(invoiceId: string) {
    const cookieStore = cookies();
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    try {
        const { data: existingInvoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).single();
        if (existingInvoice && existingInvoice.status !== 'Draft') {
            return { success: false, message: "Error: No es pot eliminar una factura que ja ha estat emesa." };
        }

        const { error } = await supabase.from('invoices').delete().match({ id: invoiceId, user_id: user.id });
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Esborrany eliminat." };
    } catch (error) {
        // ✅ CORRECCIÓ: Gestió d'errors segura
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: "Ha ocorregut un error inesperat." };
    }
}
// Defineix un tipus per a l'error que esperem de les Edge Functions de Supabase
type FunctionsError = Error & {
    context?: {
      errorMessage?: string;
    };
  };
/**
 * Server Action que fa de pont segur cap a l'Edge Function que emet una factura legal (Veri*factu).
 * @param draftInvoiceId L'ID de l'esborrany de factura a emetre.
 */
export async function issueInvoiceAction(draftInvoiceId: string) {
    const cookieStore = cookies();
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    try {
        const { data, error } = await supabase.functions.invoke('issue-verifactu-invoice', {
            body: { draft_invoice_id: draftInvoiceId, user_id: user.id },
        });

        if (error) throw new Error(error.message);

        revalidatePath('/finances/facturacio');
        return { success: true, message: "Factura emesa correctament.", invoice: data };

    } catch (error: unknown) { // ✅ 1. Capturem l'error com a 'unknown'
        // ✅ 2. Comprovem si és una instància d'Error
        if (error instanceof Error) {
            // ✅ 3. Ara podem fer un 'cast' segur al nostre tipus personalitzat
            const typedError = error as FunctionsError;
            const errorMessage = typedError.context?.errorMessage || typedError.message;
            return { success: false, message: errorMessage };
        }
        return { success: false, message: "Error en connectar amb el servei de facturació." };
    }
}