"use server";

import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { type InvoiceFormDataForAction, type InvoiceItem } from "@/types/finances/invoices";
import { type ActionResult } from "@/types/shared/index";
import { 
    upsertInvoiceHeader, 
    syncInvoiceItems, 
    updateInvoiceTotalsRecalculated 
} from "./helpers";

export async function saveInvoice(
    supabase: SupabaseClient<Database>,
    formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
    invoiceId: number | null,
    userId: string,
    teamId: string,
): Promise<ActionResult<{ id: number }>> {
    
    try {
        const { invoice_items, ...invoiceData } = formData;
        const items = invoice_items || [];
        
        // 1. Header
        const headerResult = await upsertInvoiceHeader(supabase, invoiceData as InvoiceFormDataForAction, invoiceId, userId, teamId);
        if (headerResult.error) throw new Error(headerResult.error);
        const finalId = headerResult.id;

        // 2. Items
        const itemsResult = await syncInvoiceItems(supabase, finalId, items, userId, teamId);
        if (itemsResult.error) throw new Error(itemsResult.error);
        
        // 3. Totals
        const totalsResult = await updateInvoiceTotalsRecalculated(
            supabase,
            finalId,
            items,
            Number(invoiceData.discount_amount) || 0,
            Number(invoiceData.shipping_cost) || 0,
        );
        if (totalsResult.error) throw new Error(totalsResult.error);
        
        return { success: true, message: "Factura desada correctament.", data: { id: finalId } };

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Error desconegut al desar.";
        console.error("[saveInvoice] Error:", e);
        return { success: false, message: errorMessage };
    }
}

export async function deleteInvoice(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    teamId: string,
): Promise<ActionResult> {
    
  // Validació d'estat
  const { data: invoiceStatus, error: statusError } = await supabase
      .from("invoices")
      .select("status")
      .eq("id", invoiceId)
      .eq("team_id", teamId)
      .single();

  if (statusError) return { success: false, message: "Factura no trobada." };
  if (invoiceStatus.status !== "Draft") return { success: false, message: "No es pot esborrar una factura emesa." };

  // Neteja d'adjunts (Storage)
  const supabaseAdmin = createAdminClient();
  const { data: attachments } = await supabase.from("invoice_attachments").select("file_path").eq("invoice_id", invoiceId);
  
  if (attachments && attachments.length > 0) {
      const filePaths = attachments.map((a) => a.file_path).filter((p): p is string => p !== null);
      if (filePaths.length > 0) {
          await supabaseAdmin.storage.from("factures-adjunts").remove(filePaths);
      }
  }

  // Esborrat DB (Cascade s'encarregarà dels items, però ho fem explícit)
  const { error: deleteError } = await supabase.from("invoices").delete().eq("id", invoiceId).eq("team_id", teamId);

  if (deleteError) return { success: false, message: `Error esborrant: ${deleteError.message}` };

  return { success: true, message: "Factura esborrada." };
}