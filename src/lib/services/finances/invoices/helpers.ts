import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { type DbTableInsert, type DbTableUpdate } from "@/types/db";
import { type InvoiceFormDataForAction, type InvoiceItem } from "@/types/finances/invoices";
import { calculateLineValues, calculateDocumentTotals } from "@/lib/services/finances/calculations"; // Assegura't que la ruta és correcta
import { getCompanyProfile } from "@/lib/services/settings/team/team.service";
import { getContactById } from "@/lib/services/crm/contacts/contacts.service";
import crypto from "crypto";

// Tipus locals
type Contact = Database["public"]["Tables"]["contacts"]["Row"] | null;

export function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regex.test(id);
}

export async function upsertInvoiceHeader(
    supabase: SupabaseClient<Database>,
    invoiceData: InvoiceFormDataForAction,
    invoiceId: number | null,
    userId: string,
    teamId: string,
): Promise<{ id: number; error: string | null }> {
    
    // ✅ CORRECCIÓ 1: Tipem explícitament com a DbTableUpdate (tots els camps opcionals)
    // Això funciona perfecte per a l'update, i per a l'insert ho completarem després.
    const dataToUpsert: DbTableUpdate<'invoices'> = {
        contact_id: invoiceData.contact_id || null,
        budget_id: invoiceData.budget_id || null,
        quote_id: invoiceData.quote_id || null,
        project_id: invoiceData.project_id || null,
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date ? new Date(invoiceData.issue_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        due_date: invoiceData.due_date ? new Date(invoiceData.due_date).toISOString().split("T")[0] : null,
        status: invoiceData.status,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        payment_details: invoiceData.payment_details,
        client_reference: invoiceData.client_reference,
        currency: invoiceData.currency || "EUR",
        language: invoiceData.language || "ca",
        discount_amount: Number(invoiceData.discount_amount) || 0,
        shipping_cost: Number(invoiceData.shipping_cost) || 0,
        extra_data: invoiceData.extra_data,
        
        // Camps denormalitzats a null (s'omplen al finalitzar)
        client_name: null, client_tax_id: null, client_address: null, client_email: null,
        company_name: null, company_tax_id: null, company_address: null, company_email: null, company_logo_url: null,
        verifactu_uuid: null, verifactu_qr_data: null, verifactu_signature: null, verifactu_previous_signature: null,
        sent_at: null, paid_at: null,
    };

    let query;
    if (invoiceId) {
        query = supabase.from("invoices").update(dataToUpsert).eq("id", invoiceId).eq("team_id", teamId);
    } else {
        // ✅ En fer l'INSERT, afegim els camps obligatoris que falten i fem cast a DbTableInsert
        query = supabase.from("invoices").insert({
            ...dataToUpsert,
            user_id: userId,
            team_id: teamId,
            total_amount: 0, subtotal: 0, tax_amount: 0, retention_amount: 0,
        } as DbTableInsert<'invoices'>);
    }

    const { data, error } = await query.select("id").single();
    if (error) {
        console.error("[Helpers] Error upserting invoice header:", error);
        return { id: 0, error: error.message };
    }
    return { id: data.id, error: null };
}

export async function syncInvoiceItems(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    items: InvoiceItem[],
    userId: string,
    teamId: string,
): Promise<{ error: string | null }> {
    
    // 1. Neteja d'items eliminats
    const existingValidUuids = items?.map(item => item.id).filter(isValidUuid).map(id => String(id)); 

    let deleteQuery = supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    if (existingValidUuids && existingValidUuids.length > 0) {
        const filterString = `(${existingValidUuids.join(',')})`;
        deleteQuery = deleteQuery.not('id', 'in', filterString);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) return { error: `Error esborrant conceptes antics: ${deleteError.message}` };
    
    if (!items || items.length === 0) return { error: null };

    // 2. Preparació upserts
    // ✅ CORRECCIÓ 2: Substituïm 'any[]' pels tipus correctes de la DB
    const itemsToUpsert: DbTableInsert<'invoice_items'>[] = [];
    const taxesToInsert: DbTableInsert<'invoice_item_taxes'>[] = [];
    
    for (const item of items) {
        const isNew = !isValidUuid(item.id);
        const itemId = isNew ? crypto.randomUUID() : String(item.id);

        // Càlcul centralitzat
        const lineValues = calculateLineValues(item);

        itemsToUpsert.push({
            id: itemId,
            invoice_id: invoiceId,
            user_id: userId,
            team_id: teamId,
            product_id: item.product_id ? Number(item.product_id) : null,
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            total: lineValues.baseAmount, // Guardem la BASE
            discount_percentage: item.discount_percentage ? Number(item.discount_percentage) : null,
            discount_amount: item.discount_amount ? Number(item.discount_amount) : null,
            reference_sku: item.reference_sku || null,
            // tax_rate: 0, // Si la DB ho requereix per legacy, pots posar 0 o calcular la mitjana aquí
        });
        
        if (item.taxes && item.taxes.length > 0) {
            await supabase.from('invoice_item_taxes').delete().eq('invoice_item_id', itemId);

            for (const tax of item.taxes) {
                const taxAmount = lineValues.baseAmount * (tax.rate / 100);
                taxesToInsert.push({
                    team_id: teamId,
                    invoice_item_id: itemId,
                    tax_rate_id: tax.id,
                    name: tax.name,
                    rate: tax.rate,
                    amount: taxAmount,
                });
            }
        }
    }

    if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('invoice_items').upsert(itemsToUpsert);
        if (upsertError) return { error: `Error guardant línies: ${upsertError.message}` };
    }
    
    if (taxesToInsert.length > 0) {
        const { error: insertTaxesError } = await supabase.from('invoice_item_taxes').insert(taxesToInsert);
        if (insertTaxesError) return { error: `Error guardant impostos: ${insertTaxesError.message}` };
    }

    return { error: null };
}

export async function updateInvoiceTotalsRecalculated(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    items: InvoiceItem[],
    discountAmount: number,
    shippingCost: number
): Promise<{ error: string | null }> {
    
    const totals = calculateDocumentTotals(items, discountAmount, shippingCost, false);

    const { error } = await supabase
        .from("invoices")
        .update({
            subtotal: totals.subtotal,
            tax_amount: totals.taxAmount,
            retention_amount: totals.retentionAmount,
            total_amount: totals.totalAmount,
            shipping_cost: shippingCost,
            discount_amount: discountAmount
        })
        .eq("id", invoiceId);

    if (error) {
        console.error("[Helpers] Error updating totals:", error);
        return { error: error.message };
    }
    return { error: null };
}

export async function getInvoiceContext(
    supabase: SupabaseClient<Database>,
    teamId: string,
    contactId: number | null,
) {
  const companyProfile = await getCompanyProfile(supabase, teamId);
  let contact: Contact = null;
  if (contactId) {
      contact = await getContactById(supabase, teamId, contactId);
  }
  return { companyProfile, contact };
}