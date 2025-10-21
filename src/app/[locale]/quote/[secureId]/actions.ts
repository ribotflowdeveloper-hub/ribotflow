"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { QuoteItem } from '@/types/crm';
import { z } from 'zod';

// Esquema de validació per a l'acceptació
const AcceptQuoteSchema = z.string().uuid("L'identificador del pressupost és invàlid.");

// Esquema de validació per al rebuig
const RejectQuoteSchema = z.object({
    secureId: z.string().uuid("L'identificador del pressupost és invàlid."),
    reason: z.string().min(10, "El motiu del rebuig ha de tenir almenys 10 caràcters.").max(500, "El motiu és massa llarg."),
});

/**
 * Gestiona l'acceptació d'un pressupost, actualitza l'oportunitat associada
 * i crea un esborrany de factura amb tots els seus conceptes.
 */
export async function acceptQuoteAction(secureId: string) {
    const validation = AcceptQuoteSchema.safeParse(secureId);
    if (!validation.success) {
        return { success: false, message: validation.error.issues[0].message };
    }

    const supabaseAdmin = createAdminClient();

    try {
        // PAS 1: Actualitzem el pressupost a 'Accepted' i recuperem totes les seves dades,
        // incloent els conceptes ('items') en una sola consulta.
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'Accepted' })
            .eq('secure_id', secureId)
            .select('*, items:quote_items(*)')
            .single();

        if (quoteError) throw new Error(`Error en actualitzar el pressupost: ${quoteError.message}`);
        if (!quote) throw new Error("No s'ha trobat el pressupost després d'actualitzar.");

        // PAS 2: Actualitzem l'oportunitat associada a 'Guanyat'.
        if (quote.opportunity_id) {
            await supabaseAdmin
                .from('opportunities')
                .update({ stage_name: 'Guanyat' })
                .eq('id', quote.opportunity_id);
        }

        // PAS 3: Creem un nou esborrany de factura amb les dades del pressupost.
        const { data: newInvoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .insert({
                user_id: quote.user_id,
                team_id: quote.team_id,
                contact_id: quote.contact_id,
                quote_id: quote.id,
                status: 'Draft',
                total_amount: quote.total,
                subtotal: quote.subtotal,
                tax_amount: quote.tax,
                discount_amount: quote.discount,
                issue_date: new Date().toISOString().slice(0, 10),
                due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().slice(0, 10),
            })
            .select('id')
            .single();

        if (invoiceError) throw new Error(`Error en crear la factura: ${invoiceError.message}`);

        // PAS 4: Copiem els conceptes del pressupost a la nova factura.
        if (quote.items && quote.items.length > 0) {
            const newInvoiceItems = quote.items.map((item: QuoteItem) => {
                // Calculem el total de la línia al servidor per a més seguretat.
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0);

                return {
                    invoice_id: newInvoice.id,
                    product_id: item.product_id || null,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    total: lineTotal,
                    user_id: quote.user_id,
                    team_id: quote.team_id,
                };
            });

            await supabaseAdmin.from('invoice_items').insert(newInvoiceItems).throwOnError();
        }

        // Revalidem les rutes afectades per a que la UI es refresqui.
        revalidatePath('/crm/quotes');
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Pressupost acceptat i esborrany de factura creat correctament." };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en processar l'acceptació.";
        console.error("[acceptQuoteAction] Error:", message);
        return { success: false, message };
    }
}
/**
 * Gestiona el rebuig d'un pressupost de manera segura al servidor.
 */
export async function rejectQuoteAction(secureId: string, reason: string) {
    const validation = RejectQuoteSchema.safeParse({ secureId, reason });
    if (!validation.success) {
        return { success: false, message: validation.error.issues[0].message };
    }

    const supabaseAdmin = createAdminClient();

    try {
        const { data: quote } = await supabaseAdmin
            .from('quotes')
            .select('id, user_id, team_id, contact_id, opportunity_id')
            .eq('secure_id', secureId)
            .single()
            .throwOnError();

        await supabaseAdmin.from('quotes').update({ status: 'Declined', rejection_reason: reason }).eq('id', quote.id);

        if (quote.opportunity_id) {
            await supabaseAdmin.from('opportunities').update({ stage_name: 'Negociació' }).eq('id', quote.opportunity_id);
        }

        await supabaseAdmin.from('activities').insert({
            user_id: quote.user_id,
            team_id: quote.team_id,
            contact_id: quote.contact_id,
            quote_id: quote.id,
            opportunity_id: quote.opportunity_id,
            type: 'Rebuig de Pressupost',
            content: reason,
            is_read: false
        });

        revalidatePath('/crm/quotes');
        return { success: true, message: "El rebuig s'ha processat correctament." };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
    }
}


