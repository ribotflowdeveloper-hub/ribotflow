// src/app/[locale]/(app)/finances/invoices/Actions.ts
"use server";

import crypto from 'crypto'; // ✅ CORRECCIÓ 1: Importem el mòdul 'crypto' de Node.js

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
    type InvoiceAttachmentRow // ✅ Importem explícitament InvoiceAttachmentRow
} from '@/types/finances/invoices';
import { type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from 'resend'; // npm install resend
import { generateInvoicePdfBuffer } from '@/lib/pdf/generateInvoicePDF'; // ✅ IMPORTEM LA FUNCIÓ EXTERNA
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
        project_id: invoiceData.project_id || null, // UUID string or null
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date ? new Date(invoiceData.issue_date).toISOString().split('T')[0] : undefined,
        due_date: invoiceData.due_date ? new Date(invoiceData.due_date).toISOString().split('T')[0] : null,
        status: invoiceData.status,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        payment_details: invoiceData.payment_details,
        client_reference: invoiceData.client_reference,
        currency: invoiceData.currency || 'EUR',
        language: invoiceData.language || 'ca',
        discount_amount: Number(invoiceData.discount_amount) || 0,
        tax_rate: Number(invoiceData.tax_rate) || 0,
        shipping_cost: Number(invoiceData.shipping_cost) || 0,
        extra_data: invoiceData.extra_data,
        // company_logo_url: invoiceData.company_logo_url, // From settings?
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
        console.error("Error upserting invoice header:", error);
        return { success: false, message: `Error desant capçalera: ${error.message ?? 'Error desconegut'}` };
    }
    if (!data?.id) {
         return { success: false, message: "No s'ha pogut obtenir l'ID de la factura." };
    }
    // L'ID retornat és bigint (number)
    return { success: true, message: "Capçalera desada.", data: { id: data.id } };
}


async function syncInvoiceItems(
    supabase: SupabaseClient,
    invoiceId: number, // bigint
    items: InvoiceItem[],
    userId: string, // uuid
    teamId: string  // uuid
): Promise<ActionResult<{ calculatedSubtotal: number; calculatedTotalLineDiscount: number }>> {
    let calculatedSubtotal = 0;
    let calculatedTotalLineDiscount = 0;

    const { data: existingDbItems, error: fetchError } = await supabase
        .from('invoice_items')
        .select('id') // id is uuid (string)
        .eq('invoice_id', invoiceId)
        .returns<{ id: string }[]>();

    if (fetchError) return { success: false, message: `Error obtenint items antics: ${fetchError.message}` };

    const existingDbItemIds = existingDbItems ? existingDbItems.map(item => item.id) : [];

    const itemsToUpsert = items.map(item => {
        const quantity = Number(item.quantity) || 0;
        const unit_price = Number(item.unit_price) || 0;
        const lineTotal = quantity * unit_price;
        calculatedSubtotal += lineTotal;

        let lineDiscount = 0;
        const discountPercentage = Number(item.discount_percentage) || 0;
        const discountAmount = Number(item.discount_amount) || 0;
        if (discountAmount > 0) {
            lineDiscount = discountAmount;
        } else if (discountPercentage > 0) {
            lineDiscount = lineTotal * (discountPercentage / 100);
        }
        calculatedTotalLineDiscount += lineDiscount;

        // Make sure item.invoice_id type matches DB (bigint -> number)
        // Make sure product_id type matches DB (bigint -> number | null)
        return {
           id: typeof item.id === 'string' && item.id.startsWith('temp-') ? undefined : item.id, // uuid string or undefined
           invoice_id: invoiceId, // bigint (number)
           user_id: userId, // uuid string
           team_id: teamId, // uuid string
           product_id: item.product_id ? Number(item.product_id) : null, // bigint (number | null)
           description: item.description,
           quantity: quantity,
           unit_price: unit_price,
           total: lineTotal - lineDiscount,
           tax_rate: Number(item.tax_rate) || null,
           discount_percentage: discountPercentage > 0 ? discountPercentage : null,
           discount_amount: discountAmount > 0 ? discountAmount : null,
           reference_sku: item.reference_sku || null,
       };
    });

    const currentFormItemIds = items
        .map(item => item.id)
        .filter((id): id is string => typeof id === 'string' && !id.startsWith('temp-'));

    const itemsToDeleteIds = existingDbItemIds.filter(dbId => !currentFormItemIds.includes(dbId));

    if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('invoice_items').upsert(itemsToUpsert, { onConflict: 'id' });
        if (upsertError) {
             console.error("Error upserting invoice items:", upsertError);
            return { success: false, message: `Error actualitzant línies: ${upsertError.message}` };
        }
    }

    if (itemsToDeleteIds.length > 0) {
        const { error: deleteError } = await supabase.from('invoice_items').delete().in('id', itemsToDeleteIds); // id is uuid (string)
        if (deleteError) {
            console.error("Error deleting old invoice items:", deleteError);
            return { success: false, message: `Error esborrant línies antigues: ${deleteError.message}` };
        }
    }
    return {
        success: true,
        message: "Línies sincronitzades.",
        data: { calculatedSubtotal, calculatedTotalLineDiscount }
    };
}


async function updateInvoiceTotals(
    supabase: SupabaseClient,
    invoiceId: number, // bigint
    subtotal: number,
    totalLineDiscount: number,
    generalDiscount: number,
    taxRate: number,
    shippingCost: number
): Promise<ActionResult> {
   const subtotalAfterLineDiscounts = subtotal - totalLineDiscount;
   const effectiveSubtotal = subtotalAfterLineDiscounts - generalDiscount;
   const calculatedTaxRate = taxRate || 0;
   const taxAmount = effectiveSubtotal > 0 ? effectiveSubtotal * (calculatedTaxRate / 100) : 0;
   const totalAmount = effectiveSubtotal + taxAmount + shippingCost;

   const { error } = await supabase
       .from('invoices')
       .update({
           subtotal: subtotal, // Store raw subtotal before discounts
           tax_amount: taxAmount,
           total_amount: totalAmount,
           shipping_cost: shippingCost,
           // general discount (discount_amount) is already saved in upsertInvoice
       })
       .eq('id', invoiceId); // id is bigint

   if (error) {
       console.error("Error updating invoice totals:", error);
       return { success: false, message: `Error actualitzant totals: ${error.message}` };
    }
   return { success: true, message: "Totals actualitzats." };
}

export async function saveInvoiceAction(
  formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
  invoiceId: number | null // bigint
): Promise<ActionResult<{ id: number }>> { // Returns bigint id
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const { invoice_items, ...invoiceData } = formData;

  const invoiceResult = await upsertInvoice(supabase, invoiceData, invoiceId, user.id, activeTeamId);

  if (!invoiceResult.success || !invoiceResult.data?.id) {
    return { success: false, message: invoiceResult.message || "Error desant la capçalera." };
  }
  const resultingInvoiceId = invoiceResult.data.id; // bigint (number)

  const itemsResult = await syncInvoiceItems(supabase, resultingInvoiceId, invoice_items || [], user.id, activeTeamId);

  if (!itemsResult.success) {
    return { success: false, message: itemsResult.message, data: { id: resultingInvoiceId } };
  }
  const calculatedSubtotal = itemsResult.data?.calculatedSubtotal ?? 0;
  const calculatedTotalLineDiscount = itemsResult.data?.calculatedTotalLineDiscount ?? 0;

  const totalsResult = await updateInvoiceTotals(
      supabase,
      resultingInvoiceId,
      calculatedSubtotal,
      calculatedTotalLineDiscount,
      Number(invoiceData.discount_amount), // General discount
      Number(invoiceData.tax_rate), // General tax rate
      Number(invoiceData.shipping_cost) // Shipping cost
  );

   if (!totalsResult.success) {
       console.warn(`Factura ${resultingInvoiceId} desada, però error actualitzant totals: ${totalsResult.message}`);
   }

  revalidatePath('/finances/invoices');
  revalidatePath(`/finances/invoices/${resultingInvoiceId}`);

  return { success: true, message: "Factura desada correctament.", data: { id: resultingInvoiceId } };
}

export async function deleteInvoiceAction(invoiceId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // ✅ PAS 1: Comprovar l'estat ABANS de fer res
  const { data: invoiceStatus, error: statusError } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .eq('team_id', activeTeamId)
    .single();

  if (statusError) {
    return { success: false, message: "Factura no trobada o accés denegat." };
  }

  if (invoiceStatus.status !== 'Draft') {
    return { success: false, message: "No es pot esborrar una factura que ja ha estat emesa. Només esborranys." };
  }

  // ✅ PAS 2: La factura ÉS 'Draft'. Procedim amb l'esborrat (Storage primer)
  const supabaseAdmin = createAdminClient();

  const { data: attachments, error: attachError } = await supabase
      .from('invoice_attachments')
      .select('id, file_path')
      .eq('invoice_id', invoiceId);

  if (attachError) console.error("Error obtenint adjunts per esborrar:", attachError.message);

  if (attachments && attachments.length > 0) {
      const filePaths = attachments.map(a => a.file_path).filter((p): p is string => p !== null);
      
      if (filePaths.length > 0) {
          const { error: storageError } = await supabaseAdmin.storage.from('factures-adjunts').remove(filePaths);
          if (storageError) console.warn("Error esborrant adjunts de Storage:", storageError.message);
      }
      // Nota: Els 'invoice_attachments' s'esborraran automàticament per 'ON DELETE CASCADE'
      // Si no tens CASCADE, hauries d'esborrar-los explícitament aquí.
  }

  // ✅ PAS 3: Esborrar la factura.
  // Aquesta crida funcionarà perquè hem comprovat 'status' i les RLS ho permetran.
  const { error: deleteError } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('team_id', activeTeamId);

  if (deleteError) {
      console.error("Error deleting invoice:", deleteError);
      // Això podria fallar si la RLS és diferent de la nostra comprovació
      return { success: false, message: `Error esborrant factura: ${deleteError.message}` };
  }

  revalidatePath('/finances/invoices');
  return { success: true, message: "Factura esborrada." };
}


// --- Accions per a Adjunts ---

export async function uploadInvoiceAttachmentAction(
    invoiceId: number, // bigint
    formData: FormData
): Promise<ActionResult<{ newAttachment: InvoiceAttachment }>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." };

    // ✅ CORRECCIÓ: Comprovem el resultat de la consulta, no supabase.data
    const { data: invoiceCheckData, error: invoiceCheckError } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', invoiceId)
        .eq('team_id', activeTeamId)
        .maybeSingle(); // Use maybeSingle to get null if not found

    // Si hi ha error O si no hi ha error però no s'ha trobat cap dada
    if(invoiceCheckError || !invoiceCheckData) {
         console.error("Invoice check failed:", invoiceCheckError);
         return { success: false, message: "Factura no trobada o accés denegat." };
    }


    const filePath = `${activeTeamId}/invoices/${invoiceId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("factures-adjunts").upload(filePath, file);
    if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return { success: false, message: `Error pujant a Storage: ${uploadError.message}` };
    }

    // ✅ CORRECCIÓ: Usem InvoiceAttachmentRow importat
    const attachmentData: Partial<InvoiceAttachmentRow> = {
        invoice_id: invoiceId, // bigint
        file_path: filePath,
        filename: file.name,
        mime_type: file.type,
        // Nota: user_id y team_id no son propiedades de invoice_attachments según el esquema de Supabase
    };

    const { data: dbData, error: dbError } = await supabase
        .from("invoice_attachments")
        .insert(attachmentData)
        .select()
        .single();

    if (dbError) {
        console.error("DB insert error for attachment:", dbError);
        await supabase.storage.from("factures-adjunts").remove([filePath]);
        return { success: false, message: `Error desant adjunt a BD: ${dbError.message}` };
    }

    revalidatePath(`/finances/invoices/${invoiceId}`);
    // dbData.id és UUID (string)
    return {
        success: true,
        message: "Adjunt pujat correctament.",
        // El tipus InvoiceAttachment ja espera 'id' com a string
        data: { newAttachment: dbData as InvoiceAttachment }
    };
}

export async function getInvoiceAttachmentSignedUrl(filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { activeTeamId } = session;

    if (!filePath || typeof filePath !== 'string' || !filePath.startsWith(`${activeTeamId}/`)) {
       return { success: false, message: "Ruta de fitxer invàlida o accés denegat." };
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage
        .from('factures-adjunts')
        .createSignedUrl(filePath, 300);

    if (error) {
         console.error("Error creating signed URL:", error);
        return { success: false, message: `Error generant URL signada: ${error.message}` };
    }
    if (!data?.signedUrl) {
         return { success: false, message: "No s'ha pogut generar la URL signada." };
    }

    return { success: true, message: "URL signada generada.", data: { signedUrl: data.signedUrl } };
}

export async function deleteInvoiceAttachmentAction(
    attachmentId: string, // uuid string
    filePath: string | null
): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

     if (!attachmentId) return { success: false, message: "Falta l'ID de l'adjunt."};

    const { data: attachment, error: fetchError } = await supabase
        .from('invoice_attachments')
        .select('id, file_path, team_id, invoice_id') // invoice_id is bigint
        .eq('id', attachmentId) // id is uuid string
        .single();

     if (fetchError || !attachment) {
         console.error("Error fetching attachment to delete:", fetchError);
         return { success: false, message: "Adjunt no trobat." };
     }
     if (attachment.team_id !== activeTeamId) {
         return { success: false, message: "Accés denegat." };
     }

     const finalFilePath = filePath || attachment.file_path;

    const { error: dbError } = await supabase.from('invoice_attachments').delete().eq('id', attachmentId);
    if (dbError) {
        console.error("Error deleting attachment from DB:", dbError);
        return { success: false, message: `Error esborrant adjunt de BD: ${dbError.message}` };
    }

    if (finalFilePath) {
      const supabaseAdmin = createAdminClient();
      const { error: storageError } = await supabaseAdmin.storage.from('factures-adjunts').remove([finalFilePath]);
      if (storageError) {
          console.warn(`Adjunt ${attachmentId} esborrat de BD, però error esborrant de Storage (${finalFilePath}): ${storageError.message}`);
      }
    } else {
         console.warn(`Adjunt ${attachmentId} esborrat de BD, però no s'ha trobat file_path per esborrar de Storage.`);
    }

    if (attachment.invoice_id) {
        revalidatePath(`/finances/invoices/${attachment.invoice_id}`);
    } else {
         revalidatePath('/finances/invoices');
    }

    return { success: true, message: "Adjunt eliminat correctament." };
}

//-------------------VERIFACTU ----------------
/**
 * FINALITZA UNA FACTURA:
 * Canvia l'estat a 'Sent', genera la signatura VeriFactu (mock)
 * i l'encadena amb l'anterior.
 * AQUESTA ÉS L'ACCIÓ QUE CRIDARÀ A L'API EXTERNA EN EL FUTUR.
 */
export async function finalizeInvoiceAction(
  invoiceId: number,
): Promise<ActionResult<{ signature: string }>> {
  
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // 1. Obtenir les dades completes de la factura
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .select(
      `
      *,
      invoice_items (*)
    `
    )
    .eq('id', invoiceId)
    .eq('team_id', activeTeamId)
    .single(); 

  if (invoiceError) {
    console.error('Error obtenint factura per finalitzar:', invoiceError);
    return { success: false, message: 'Factura no trobada.' };
  }

  if (invoiceData.status !== 'Draft') {
    return { success: false, message: 'Aquesta factura ja ha estat emesa.' };
  }

  // 2. Obtenir l'última signatura de l'equip (per encadenar)
  
  // ✅✅✅ CORRECCIÓ PRINCIPAL AQUÍ ✅✅✅
  // La sintaxi correcta per "IS NOT NULL" és .not('columna', 'is', null)
  const { data: lastSignatureData, error: lastSignatureError } = await supabase
    .from('invoices')
    .select('verifactu_signature')
    .eq('team_id', activeTeamId)
    .not('sent_at', 'is', null) // <-- AQUEST ÉS EL CANVI
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // .maybeSingle() gestiona correctament el cas de "0 files"

  // Si hi ha un error, ara serà un error real de BBDD, no de sintaxi.
  if (lastSignatureError) { 
    console.error("Error consultant l'historial de signatures:", lastSignatureError);
    return { success: false, message: "No s'ha pogut obtenir l'historial de signatures." }
  }
  
  const previousSignature = lastSignatureData?.verifactu_signature || null;

  // --- AQUESTA ÉS LA PART "MOCK" QUE SE SUBSTITUIRÀ ---
  
  // 3. Generar la signatura (Mock)
  const dataToSign = JSON.stringify({
    team_id: invoiceData.team_id,
    contact_id: invoiceData.contact_id,
    invoice_number: invoiceData.invoice_number,
    issue_date: invoiceData.issue_date,
    total_amount: invoiceData.total_amount,
    items: (invoiceData.invoice_items || []).map((item: InvoiceItem) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    previous_signature: previousSignature,
  });

  const currentSignature = crypto
    .createHash('sha256')
    .update(dataToSign)
    .digest('hex');

  const mockVerifactuUuid = crypto.randomUUID();
  const mockQrData = `https://www.agenciatributaria.es/qr_mock/${mockVerifactuUuid}`;
  
  // ---------------------------------------------------
  
  // 4. Actualitzar la factura a la BBDD
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'Sent', 
      sent_at: new Date().toISOString(),
      verifactu_uuid: mockVerifactuUuid,
      verifactu_signature: currentSignature,
      verifactu_previous_signature: previousSignature,
      verifactu_qr_data: mockQrData,
    })
    .eq('id', invoiceId)
    .eq('team_id', activeTeamId)
    .eq('status', 'Draft'); 

  if (updateError) {
    console.error('Error al finalitzar factura:', updateError);
    return { success: false, message: `No s'ha pogut emetre la factura: ${updateError.message}` };
  }

  revalidatePath('/finances/invoices');
  revalidatePath(`/finances/invoices/${invoiceId}`);

  return { success: true, message: "Factura emesa i registrada (MOCK).", data: { signature: currentSignature } };
}

export async function sendInvoiceByEmailAction(
  invoiceId: number,
  recipientEmail: string
): Promise<ActionResult> {

  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // 1. Obtenir les dades de la factura
  const invoiceData = await fetchInvoiceDetail(invoiceId);

  if (!invoiceData) {
    return { success: false, message: "Factura no trobada." };
  }
  
  // 2. Validació CRÍTICA
  if (invoiceData.status === 'Draft') {
    return { success: false, message: "No es pot enviar un esborrany. Has d'emetre la factura primer." };
  }

  // 3. Generar el PDF (crida a la funció externa)
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateInvoicePdfBuffer(invoiceData); // ✅ MOLT MÉS NET
  } catch (error) {
    console.error("Error generant el PDF al servidor:", error);
    // Transmetem l'error que hem llançat des de la nostra funció
    return { success: false, message: (error as Error).message || "No s'ha pogut generar el PDF." };
  }

  // 4. Enviar l'email amb 'Resend'
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fileName = `factura-${invoiceData.invoice_number || invoiceData.id}.pdf`;

  try {
    await resend.emails.send({
      from: 'facturacio@ribotflow.com', // El teu email configurat a Resend
      to: recipientEmail,
      subject: `Nova Factura: ${invoiceData.invoice_number}`,
      html: `<p>Adjunt trobaràs la factura ${invoiceData.invoice_number}.</p>`,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  } catch (error) {
    console.error("Error enviant email amb Resend:", error);
    return { success: false, message: "Error en el servei d'enviament d'email." };
  }

  // 5. (Opcional) Registrar el lliurament
  if (process.env.NODE_ENV !== 'development') { 
      try {
        await supabase.from('invoice_deliveries').insert({
            invoice_id: invoiceId,
            team_id: activeTeamId,
            method: 'email',
            recipient: recipientEmail,
        });
      } catch (dbError) {
        console.warn("No s'ha pogut registrar el lliurament de la factura:", dbError);
      }
  }

  return { success: true, message: `Factura enviada a ${recipientEmail}.` };
}