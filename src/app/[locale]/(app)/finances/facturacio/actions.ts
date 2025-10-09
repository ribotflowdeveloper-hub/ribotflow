"use server";


import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció


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
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    try {
        const { invoice_items, ...invoiceFields } = invoiceData;

        // Simplement cridem la funció RPC amb les dades.
        // La base de dades s'encarrega de la transacció.
        const { error } = await supabase.rpc('upsert_invoice_with_items', {
            invoice_data: invoiceFields,
            items_data: invoice_items,
            user_id: user.id,
            team_id: activeTeamId
        });

        if (error) throw error;

        revalidatePath('/finances/facturacio');
        return { success: true, message: `Esborrany ${invoiceData.id ? 'actualitzat' : 'creat'} correctament.` };

    } catch (error) {
        console.error("Error a upsert_invoice_with_items:", error);
        const message = error instanceof Error ? error.message : "Error desconegut en desar la factura.";
        return { success: false, message };
    }
}

/**
 * Elimina un esborrany de factura. La RLS s'encarregarà de la seguretat.
 */
export async function deleteInvoiceAction(invoiceId: string) {
    // 2. Validem la sessió. Aquesta funció ens retorna o la sessió validada o un objecte d'error.
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session; // Obtenim el client de supabase validat

    try {
        const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('status')
            .eq('id', invoiceId)
            .single();

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
    // 2. Validem la sessió. Aquesta funció ens retorna o la sessió validada o un objecte d'error.
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session; // Obtenim el client de supabase validat


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