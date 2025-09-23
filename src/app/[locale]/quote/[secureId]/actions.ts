"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { QuoteItem } from "@/types/crm";

/**
 * Server Action que s'executa quan un client ACCEPTA un pressupost.
 * Substitueix l'Edge Function 'accept-quote'.
 */
export async function acceptQuoteAction(secureId: string) {
    if (!secureId) {
        return { success: false, message: "Falta l'ID segur del pressupost." };
    }

    const supabaseAdmin = createAdminClient();

    try {
        // --- PAS 1: Actualitzem el pressupost i recuperem TOTES les seves dades, inclosos els conceptes ---
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'Accepted' })
            .eq('secure_id', secureId)
            .select('*, quote_items(*)') // ✅ Important: Demanem també els 'quote_items'
            .single();

        if (quoteError) throw new Error(`Error en actualitzar el pressupost: ${quoteError.message}`);

        // --- PAS 2: Actualitzem l'oportunitat associada (si existeix) ---
        if (quote.opportunity_id) {
            await supabaseAdmin
                .from('opportunities')
                .update({ stage_name: 'Guanyat' })
                .eq('id', quote.opportunity_id);
        }

        // --- PAS 3: Creem un ESBORRANY de factura automàticament ---
        const { data: newInvoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .insert({
                user_id: quote.user_id,
                contact_id: quote.contact_id,
                quote_id: quote.id,
                status: 'Draft',
                total_amount: quote.total,
                subtotal: quote.subtotal,
                tax_amount: quote.tax, // Asumim que 'tax' és l'import, no el percentatge
                discount_amount: quote.discount, // Asumim que 'discount' és l'import
                notes: quote.notes,
                issue_date: new Date().toISOString().slice(0, 10),
                due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().slice(0, 10),
            })
            .select('id') // Demanem l'ID de la nova factura
            .single();

        if (invoiceError || !newInvoice) throw new Error(`Error en crear la factura: ${invoiceError?.message}`);

        // --- ✅ PAS 4: Copiem els conceptes del pressupost a la nova factura ---
        if (quote.quote_items && quote.quote_items.length > 0) {
            const itemsToInsert = quote.quote_items.map((item: QuoteItem) => ({
                invoice_id: newInvoice.id, // Associem cada concepte amb la NOVA factura
                user_id: item.user_id,
                product_id: item.product_id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: 0.21 // Hauries d'ajustar això si gestiones diferents IVAs per concepte
            }));

            const { error: itemsError } = await supabaseAdmin.from('invoice_items').insert(itemsToInsert);
            if (itemsError) throw new Error(`Error en copiar els conceptes a la factura: ${itemsError.message}`);
        }
        
        revalidatePath(`/quote/${secureId}`);
        revalidatePath('/finances/facturacio'); // Revalidem també la pàgina de factures
        return { success: true, message: "Pressupost acceptat i factura creada correctament." };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en acceptar el pressupost.";
        return { success: false, message };
    }
}
/**
 * Server Action que s'executa quan un client REBUTJA un pressupost.
 * Substitueix l'Edge Function 'reject-quote'.
 */
export async function rejectQuoteAction(secureId: string, reason: string) {
    if (!secureId) return { success: false, message: "Falta l'ID segur del pressupost." };
    if (!reason) return { success: false, message: "El motiu del rebuig és obligatori." };

    const supabaseAdmin = createAdminClient();

    try {
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .select('id, user_id, contact_id, opportunity_id')
            .eq('secure_id', secureId)
            .single();

        if (quoteError) throw new Error(`No s'ha pogut trobar el pressupost: ${quoteError.message}`);

        await supabaseAdmin
            .from('quotes')
            .update({ status: 'Declined', rejection_reason: reason })
            .eq('id', quote.id);

        if (quote.opportunity_id) {
            await supabaseAdmin
                .from('opportunities')
                .update({ stage_name: 'Negociació' })
                .eq('id', quote.opportunity_id);
        }
        
        await supabaseAdmin
            .from('activities')
            .insert({
                user_id: quote.user_id,
                contact_id: quote.contact_id,
                quote_id: quote.id,
                opportunity_id: quote.opportunity_id,
                type: 'Rebuig de Pressupost',
                content: reason,
                is_read: false
            });

        revalidatePath(`/quote/${secureId}`);
        return { success: true, message: "El rebuig s'ha processat correctament." };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en rebutjar el pressupost.";
        return { success: false, message };
    }
}