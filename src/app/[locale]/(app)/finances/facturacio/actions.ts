"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Aquest tipus defineix l'estructura de les dades d'un concepte de factura
 * tal com arriben des del formulari del client.
 */
type InvoiceItemData = {
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
};

/**
 * Aquest tipus és el "contracte" de dades que la nostra Server Action espera rebre.
 * Defineix tots els camps que el formulari d'edició/creació pot enviar.
 * Assegura que les dades que arriben al servidor tenen l'estructura correcta.
 */
export type InvoiceFormData = {
    id?: string | null;
    contact_id: string;
    issue_date: string;
    due_date: string | null;
    status: 'Draft'; // Aquesta acció només treballa amb esborranys.
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    notes: string | null;
    invoice_items: InvoiceItemData[];
};

/**
 * Server Action per crear un nou esborrany de factura o actualitzar-ne un d'existent.
 * Gestiona tant les dades principals de la factura com els seus conceptes associats.
 * @param invoiceData Les dades completes de la factura enviades des del client.
 */
export async function createOrUpdateInvoiceAction(invoiceData: InvoiceFormData) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    // Separem les dades de la factura ('invoiceMainData') dels seus conceptes ('invoice_items').
    const { invoice_items, ...invoiceMainData } = invoiceData;
    const dataToUpsert = {
        ...invoiceMainData,
        user_id: user.id,
    };

    try {
        // 'upsert' és una operació intel·ligent: si l'ID ja existeix, actualitza el registre;
        // si no existeix, en crea un de nou.
        const { data: savedInvoice, error: invoiceError } = await supabase
            .from('invoices')
            .upsert(dataToUpsert)
            .select() // Demanem que ens retorni la factura desada per obtenir el seu ID.
            .single();

        if (invoiceError) throw invoiceError;

        // Per simplificar l'actualització dels conceptes, primer esborrem tots els antics
        // que estiguin associats a aquesta factura.
        await supabase.from('invoice_items').delete().eq('invoice_id', savedInvoice.id);

        // Si el formulari ha enviat nous conceptes, els inserim a la base de dades.
        if (invoice_items && invoice_items.length > 0) {
            const itemsToInsert = invoice_items.map(item => ({
                ...item,
                invoice_id: savedInvoice.id, // Associem cada concepte a la factura que acabem de desar.
                user_id: user.id,
            }));
            const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;
        }
        
        // Invalidem la memòria cau de la pàgina de facturació perquè mostri les dades actualitzades.
        revalidatePath('/finances/facturacio');
        return { success: true, message: `Esborrany ${invoiceData.id ? 'actualitzat' : 'creat'} correctament.` };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Server Action per eliminar un esborrany de factura.
 * @param invoiceId L'ID de l'esborrany a eliminar.
 */
export async function deleteInvoiceAction(invoiceId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    try {
        // Comprovació de seguretat addicional: assegurem que només es poden eliminar esborranys ('Draft').
        const { data: existingInvoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).single();
        if (existingInvoice && existingInvoice.status !== 'Draft') {
            return { success: false, message: "Error: No es pot eliminar una factura que ja ha estat emesa." };
        }

        // L'eliminació dels conceptes associats ('invoice_items') es gestiona automàticament
        // a la base de dades gràcies a la configuració "ON DELETE CASCADE".
        const { error } = await supabase.from('invoices').delete().match({ id: invoiceId, user_id: user.id });
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Esborrany eliminat." };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Server Action que fa de pont segur cap a l'Edge Function que emet una factura legal (Veri*factu).
 * @param draftInvoiceId L'ID de l'esborrany de factura a emetre.
 */
export async function issueInvoiceAction(draftInvoiceId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    try {
        // Invoquem la Edge Function 'issue-verifactu-invoice', que conté la lògica
        // complexa per generar el número de factura, les signatures digitals, el QR, etc.
        const { data, error } = await supabase.functions.invoke('issue-verifactu-invoice', {
            body: { draft_invoice_id: draftInvoiceId, user_id: user.id },
        });

        if (error) throw new Error(error.message);

        revalidatePath('/finances/facturacio');
        return { success: true, message: "Factura emesa correctament.", invoice: data };

    } catch (error: any) {
        const errorMessage = error.context?.errorMessage || error.message || "Error en connectar amb el servei de facturació.";
        return { success: false, message: errorMessage };
    }
}