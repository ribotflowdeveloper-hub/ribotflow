import { validateUserSession } from "@/lib/supabase/session";
import { InvoiceDetail } from "@/types/finances/invoices";


// ... (fetchInvoiceDetail, upsertInvoice, syncInvoiceItems, updateInvoiceTotals, saveInvoiceAction sense canvis) ...
export async function fetchInvoiceDetail(invoiceId: number): Promise<InvoiceDetail | null> {
    // ... codi existent ...
     const session = await validateUserSession();
    if ("error" in session) return null;
    const { supabase, activeTeamId } = session;

    const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*),
          invoice_attachments (*),
          contacts (*)
        `)
        .eq('id', invoiceId)
        .eq('team_id', activeTeamId)
        .single();

    if (error) {
        console.error("Error fetching invoice detail:", error.message);
        return null;
    }
    const resultData = data as InvoiceDetail;
    return {
        ...resultData,
        // Assegurem que els IDs són string (UUIDs)
        invoice_items: resultData.invoice_items?.map(item => ({...item, id: String(item.id)})) ?? [],
        invoice_attachments: resultData.invoice_attachments?.map(att => ({...att, id: String(att.id)})) ?? [],
        // project_id també és string (UUID)
        project_id: resultData.project_id ?? null,
    } as InvoiceDetail;
}