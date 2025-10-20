"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/index";
import {
  type InvoiceDetail,
  type InvoiceItem,
  type InvoiceAttachment,
  type InvoiceFormDataForAction,
  type InvoiceRow,
} from '@/types/finances/invoices';
import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * Obté el detall complet d'UNA factura.
 */
export async function fetchInvoiceDetail(invoiceId: number): Promise<InvoiceDetail | null> {
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
        invoice_items: resultData.invoice_items ?? [],
        invoice_attachments: resultData.invoice_attachments ?? [],
    } as InvoiceDetail;
}


// --- Helpers Interns per Desar ---

async function upsertInvoice(
    supabase: SupabaseClient,
    invoiceData: InvoiceFormDataForAction,
    invoiceId: number | null,
    userId: string,
    teamId: string
): Promise<ActionResult<{ id: number }>> {

    const dataToUpsert: Partial<InvoiceRow> = {
        contact_id: invoiceData.contact_id || null,
        budget_id: invoiceData.budget_id || null,
        quote_id: invoiceData.quote_id || null,
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date ? new Date(invoiceData.issue_date).toISOString().split('T')[0] : undefined,
        due_date: invoiceData.due_date ? new Date(invoiceData.due_date).toISOString().split('T')[0] : null,
        status: invoiceData.status,
        discount_amount: Number(invoiceData.discount_amount) || 0,
        tax_rate: Number(invoiceData.tax_rate) || 0,
        tax: invoiceData.tax !== null ? Number(invoiceData.tax) : null,
        discount: invoiceData.discount !== null ? Number(invoiceData.discount) : null,
        notes: invoiceData.notes,
        // terms: invoiceData.terms,
        // currency: invoiceData.currency,
        extra_data: invoiceData.extra_data,
        // project_id: invoiceData.project_id || null,
    };

    let query;
    if (invoiceId) {
        query = supabase.from('invoices').update(dataToUpsert).eq('id', invoiceId).eq('team_id', teamId);
    } else {
        query = supabase.from('invoices').insert({
            ...dataToUpsert,
            user_id: userId,
            team_id: teamId,
        });
    }

    const { data, error } = await query.select('id').single();

    if (error) {
        return { success: false, message: `Error desant capçalera: ${error.message ?? 'Error desconegut'}` };
    }
    if (!data?.id) {
         return { success: false, message: "No s'ha pogut obtenir l'ID de la factura." };
    }
    return { success: true, message: "Capçalera desada.", data: { id: data.id } };
}

async function syncInvoiceItems(
    supabase: SupabaseClient,
    invoiceId: number,
    items: InvoiceItem[],
    userId: string,
    teamId: string
): Promise<ActionResult<{ calculatedSubtotal: number }>> {
    let calculatedSubtotal = 0;

    const { data: existingDbItems, error: fetchError } = await supabase
        .from('invoice_items')
        .select('id')
        .eq('invoice_id', invoiceId)
        .returns<{ id: number }[]>();

    if (fetchError) return { success: false, message: `Error obtenint items antics: ${fetchError.message}` };
    
    const existingDbItemIds = existingDbItems ? existingDbItems.map(item => item.id) : [];

    const itemsToUpsert = items.map(item => {
        const quantity = Number(item.quantity) || 0;
        const unit_price = Number(item.unit_price) || 0;
        const total = quantity * unit_price;
        calculatedSubtotal += total;

        return {
           // Si l'ID és string (ex: 'temp-...' o '123'), el gestionem.
           id: typeof item.id === 'string' && item.id.startsWith('temp-') ? undefined : (item.id ? Number(item.id) : undefined),
           invoice_id: invoiceId,
           user_id: userId,
           team_id: teamId,
           product_id: item.product_id || null,
           description: item.description,
           quantity: quantity,
           unit_price: unit_price,
           total: total,
           tax_rate: Number(item.tax_rate) || null,
       };
    });
    
    // ✅ ===== CORRECCIÓ APLICADA AQUÍ =====
    // 1. Mapegem els IDs (que poden ser 'string' o 'number' o 'undefined' des del formulari)
    const currentFormItemIds = items
        .map(item => item.id)
        // 2. Filtrem els que són definits i NO són temporals.
        //    Utilitzem un filtre segur que sap que 'id' pot ser string o number.
        .filter((id: unknown): id is string | number => 
            id !== undefined && 
            id !== null && 
            !String(id).startsWith('temp-')
        )
        // 3. Convertim tots els IDs restants (que ara són 'string' o 'number') a 'number'.
        .map(id => Number(id)); 
    // Ara 'currentFormItemIds' és 'number[]' (ex: [123, 456])
    // i 'existingDbItemIds' és 'number[]' (ex: [123, 999])
    // ✅ =====================================

    // ✅ CORRECCIÓ: Els dos arrays són number[], 'dbId' és 'number', ja no hi ha 'any'
    // Aquesta línia ara compara number[] amb number[] i és correcta.
    const itemsToDeleteIds = existingDbItemIds.filter(dbId => !currentFormItemIds.includes(dbId));


    if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('invoice_items').upsert(itemsToUpsert, { onConflict: 'id' });
        if (upsertError) return { success: false, message: `Error actualitzant línies: ${upsertError.message}` };
    }

    if (itemsToDeleteIds.length > 0) {
        const { error: deleteError } = await supabase.from('invoice_items').delete().in('id', itemsToDeleteIds);
        if (deleteError) return { success: false, message: `Error esborrant línies antigues: ${deleteError.message}` };
    }
    return { success: true, message: "Línies sincronitzades.", data: { calculatedSubtotal } };
}

async function updateInvoiceTotals(
    supabase: SupabaseClient,
    invoiceId: number,
    subtotal: number,
    discount: number,
    taxRate: number
): Promise<ActionResult> {
   const effectiveSubtotal = subtotal - (discount || 0);
   const calculatedTaxRate = taxRate || 0;
   const taxAmount = effectiveSubtotal > 0 ? effectiveSubtotal * (calculatedTaxRate / 100) : 0;
   const totalAmount = effectiveSubtotal + taxAmount;

   const { error } = await supabase
       .from('invoices')
       .update({ subtotal, tax_amount: taxAmount, total_amount: totalAmount })
       .eq('id', invoiceId);

   if (error) return { success: false, message: `Error actualitzant totals: ${error.message}` };
   return { success: true, message: "Totals actualitzats." };
}

/**
 * Acció principal per desar una factura completa.
 */
export async function saveInvoiceAction(
  formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
  invoiceId: number | null
): Promise<ActionResult<{ id: number }>> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const { invoice_items, ...invoiceData } = formData;

  const invoiceResult = await upsertInvoice(supabase, invoiceData, invoiceId, user.id, activeTeamId);

  if (!invoiceResult.success || !invoiceResult.data?.id) {
    return { success: false, message: invoiceResult.message || "Error desant la capçalera." };
  }
  const resultingInvoiceId = invoiceResult.data.id;

  const itemsResult = await syncInvoiceItems(supabase, resultingInvoiceId, invoice_items || [], user.id, activeTeamId);

  if (!itemsResult.success) {
    return { success: false, message: itemsResult.message, data: { id: resultingInvoiceId } };
  }
  const calculatedSubtotal = itemsResult.data?.calculatedSubtotal ?? 0;

  const totalsResult = await updateInvoiceTotals(
      supabase,
      resultingInvoiceId,
      calculatedSubtotal,
      Number(invoiceData.discount_amount),
      Number(invoiceData.tax_rate)
  );

   if (!totalsResult.success) {
       console.warn(`Factura ${resultingInvoiceId} desada, però error actualitzant totals: ${totalsResult.message}`);
   }

  revalidatePath('/finances/invoices');
  revalidatePath(`/finances/invoices/${resultingInvoiceId}`);

  return { success: true, message: "Factura desada correctament.", data: { id: resultingInvoiceId } };
}

/**
 * Esborra UNA factura.
 */
export async function deleteInvoiceAction(invoiceId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;
  const supabaseAdmin = createAdminClient();

  const { data: attachments, error: attachError } = await supabase
      .from('invoice_attachments')
      .select('file_path')
      .eq('invoice_id', invoiceId);

  if (attachError) console.error("Error obtenint adjunts per esborrar:", attachError.message);

  if (attachments && attachments.length > 0) {
       const filePaths = attachments.map(a => a.file_path).filter((p): p is string => p !== null);
       if (filePaths.length > 0) {
           const { error: storageError } = await supabaseAdmin.storage.from('factures-adjunts').remove(filePaths);
           if (storageError) console.error("Error esborrant adjunts de Storage:", storageError.message);
       }
  }

  const { error: deleteError } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('team_id', activeTeamId);

  if (deleteError) return { success: false, message: `Error esborrant factura: ${deleteError.message}` };

  revalidatePath('/finances/invoices');
  return { success: true, message: "Factura esborrada." };
}


// --- Accions per a Adjunts ---

export async function uploadInvoiceAttachmentAction(
    invoiceId: number,
    formData: FormData
): Promise<ActionResult<{ newAttachment: InvoiceAttachment }>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." };

    const filePath = `${activeTeamId}/invoices/${invoiceId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("factures-adjunts").upload(filePath, file);
    if (uploadError) return { success: false, message: `Error Storage: ${uploadError.message}` };

    const attachmentData: Partial<InvoiceAttachment> = {
        invoice_id: invoiceId,
        file_path: filePath,
        filename: file.name,
        mime_type: file.type,
    };

    const { data: dbData, error: dbError } = await supabase
        .from("invoice_attachments")
        .insert(attachmentData) 
        .select()
        .single();

    if (dbError) {
        await supabase.storage.from("factures-adjunts").remove([filePath]);
        return { success: false, message: `Error BD: ${dbError.message}` };
    }

    revalidatePath(`/finances/invoices/${invoiceId}`);
    return {
        success: true,
        message: "Adjunt pujat.",
        data: { newAttachment: dbData as InvoiceAttachment }
    };
}

export async function getInvoiceAttachmentSignedUrl(filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { activeTeamId } = session;

    const fileTeamId = filePath.split('/')[0];
    if (activeTeamId !== fileTeamId) return { success: false, message: "Accés denegat." };

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage.from('factures-adjunts').createSignedUrl(filePath, 300); // 5 minuts
    if (error) return { success: false, message: `Error URL: ${error.message}` };
    return { success: true, message: "URL signada generada.", data: { signedUrl: data.signedUrl } };
}

export async function deleteInvoiceAttachmentAction(
    attachmentId: string, // id és UUID
    filePath: string
): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase } = session;

    const { error: dbError } = await supabase.from('invoice_attachments').delete().eq('id', attachmentId);
    if (dbError) return { success: false, message: `Error BD: ${dbError.message}` };

    const supabaseAdmin = createAdminClient();
    const { error: storageError } = await supabaseAdmin.storage.from('factures-adjunts').remove([filePath]);
    if (storageError) return { success: false, message: `Fitxer esborrat de BD, però error a Storage: ${storageError.message}` };

    return { success: true, message: "Adjunt eliminat." };
}