"use server";

import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { type DbTableInsert, type DbTableUpdate } from "@/types/db";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import {
    type InvoiceAttachment,
    type InvoiceDetail,
    type InvoiceFormDataForAction,
    type InvoiceItem,
} from "@/types/finances/invoices";
import { type ActionResult } from "@/types/shared/index";
import { generateInvoicePdfBuffer } from "@/lib/pdf/generateInvoicePDF";
import { type CompanyProfile } from '@/types/settings/team'

import { getCompanyProfile } from "@/lib/services/settings/team/team.service";
import { getContactById } from "@/lib/services/crm/contacts/contacts.service";
import { fetchInvoiceDetail } from "@/app/[locale]/(app)/finances/invoices/[invoiceId]/_hooks/fetchInvoiceDetail";

// ✅ IMPORTEM EL CERVELL FINANCER
import { calculateLineValues, calculateDocumentTotals, type FinancialItem } from "@/lib/services/finances/calculations";

// Tipus locals
type Contact = Database["public"]["Tables"]["contacts"]["Row"] | null;

// ✅ Helper (necessari)
function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regex.test(id);
}

// --- Funcions Internes del Servei ---

async function _upsertInvoiceHeader(
    supabase: SupabaseClient<Database>,
    invoiceData: InvoiceFormDataForAction,
    invoiceId: number | null,
    userId: string,
    teamId: string,
): Promise<{ id: number; error: string | null }> {
    
    const dataToUpsert: Omit<DbTableInsert<'invoices'>, 'id' | 'team_id' | 'user_id' | 'created_at' | 'subtotal' | 'tax_amount' | 'total_amount' | 'retention_amount' | 'legacy_tax_rate' | 'legacy_tax_amount' | 'tax' | 'discount'> = {
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
        // Guardem els inputs directes, els totals calculats es faran a _updateInvoiceTotals
        discount_amount: Number(invoiceData.discount_amount) || 0,
        shipping_cost: Number(invoiceData.shipping_cost) || 0,
        extra_data: invoiceData.extra_data,
        
        // Camps denormalitzats null (es posen al finalize)
        client_name: null, client_tax_id: null, client_address: null, client_email: null,
        company_name: null, company_tax_id: null, company_address: null, company_email: null, company_logo_url: null,
        // Camps Verifactu null
        verifactu_uuid: null, verifactu_qr_data: null, verifactu_signature: null, verifactu_previous_signature: null,
        sent_at: null, paid_at: null,
    };

    let query;
    if (invoiceId) {
        query = supabase.from("invoices").update(dataToUpsert as DbTableUpdate<"invoices">).eq("id", invoiceId).eq("team_id", teamId);
    } else {
        query = supabase.from("invoices").insert({
            ...dataToUpsert,
            user_id: userId,
            team_id: teamId,
            // Inicialitzem a 0, es corregiran immediatament
            total_amount: 0, subtotal: 0, tax_amount: 0, retention_amount: 0,
        } as DbTableInsert<'invoices'>);
    }

    const { data, error } = await query.select("id").single();
    if (error) {
        console.error("Error upserting invoice header:", error);
        return { id: 0, error: `Error desant capçalera: ${error.message ?? "Error desconegut"}` };
    }
    return { id: data.id, error: null };
}

async function _syncInvoiceItems(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    items: InvoiceItem[],
    userId: string,
    teamId: string,
): Promise<{ error: string | null }> {
    
    // 1. Neteja d'items eliminats
    const existingValidUuids = items
        ?.map(item => item.id)
        .filter(isValidUuid)
        .map(id => String(id)); 

    let deleteQuery = supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    if (existingValidUuids && existingValidUuids.length > 0) {
        const filterString = `(${existingValidUuids.join(',')})`;
        deleteQuery = deleteQuery.not('id', 'in', filterString);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) return { error: `Error esborrant conceptes antics: ${deleteError.message}` };
    
    if (!items || items.length === 0) return { error: null };

    // 2. Preparació de dades per inserció massiva
    const itemsToUpsert: DbTableInsert<'invoice_items'>[] = [];
    const taxesToInsert: DbTableInsert<'invoice_item_taxes'>[] = [];
    
    for (const item of items) {
        const isNew = !isValidUuid(item.id);
        const itemId = isNew ? crypto.randomUUID() : String(item.id);

        // ✅ USEM EL CERVELL FINANCER per calcular la base de la línia
        // Això assegura que el que guardem a la columna 'total' (base) és matemàticament correcte
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
            // IMPORTANT: Guardem la BASE IMPOSABLE de la línia (Unit * Qty - Descompte Línia)
            total: lineValues.baseAmount, 
            discount_percentage: item.discount_percentage ? Number(item.discount_percentage) : null,
            discount_amount: item.discount_amount ? Number(item.discount_amount) : null,
            reference_sku: item.reference_sku || null,
        });
        
        // Generació de les files d'impostos associades a la línia
        if (item.taxes && item.taxes.length > 0) {
            // Primer netegem impostos antics d'aquesta línia per evitar duplicats en updates
            await supabase.from('invoice_item_taxes').delete().eq('invoice_item_id', itemId);

            for (const tax of item.taxes) {
                // Calculem la quota d'aquest impost específic sobre la base de la línia
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

    // 3. Execució DB
    if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('invoice_items').upsert(itemsToUpsert as DbTableInsert<'invoice_items'>[]);
        if (upsertError) return { error: `Error fent upsert d'items: ${upsertError.message}` };
    }
    
    if (taxesToInsert.length > 0) {
        const { error: insertTaxesError } = await supabase.from('invoice_item_taxes').insert(taxesToInsert);
        if (insertTaxesError) return { error: `Error inserint nous impostos: ${insertTaxesError.message}` };
    }

    return { error: null };
}

async function _updateInvoiceTotals(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    items: InvoiceItem[],
    discountAmount: number,
    shippingCost: number
): Promise<{ error: string | null }> {
    
    // ✅ USEM EL CERVELL FINANCER per calcular els totals globals
    // Passem tots els ítems, el descompte general (import) i el cost d'enviament
    const totals = calculateDocumentTotals(items, discountAmount, shippingCost, false); // false = discountAmount és import, no %

    const { error } = await supabase
        .from("invoices")
        .update({
            subtotal: totals.subtotal,             // Suma bruta
            tax_amount: totals.taxAmount,          // IVA Total
            retention_amount: totals.retentionAmount, // IRPF Total
            total_amount: totals.totalAmount,      // Total a Pagar
            shipping_cost: shippingCost,
            discount_amount: discountAmount
        })
        .eq("id", invoiceId);

    if (error) {
        console.error("Error updating invoice totals:", error);
        return { error: `Error actualitzant totals: ${error.message}` };
    }
    return { error: null };
}

async function _getInvoiceContext(
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


// --- Serveis Principals (Exportats) ---

export async function saveInvoice(
    supabase: SupabaseClient<Database>,
    formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
    invoiceId: number | null,
    userId: string,
    teamId: string,
): Promise<ActionResult<{ id: number }>> {
    
    const { invoice_items, ...invoiceData } = formData;
    
    // 1. Desar capçalera
    const invoiceResult = await _upsertInvoiceHeader(
        supabase,
        invoiceData as InvoiceFormDataForAction,
        invoiceId,
        userId,
        teamId,
    );
    if (invoiceResult.error || !invoiceResult.id) {
        return { success: false, message: invoiceResult.error || "Error desant la capçalera." };
    }
    const resultingInvoiceId = invoiceResult.id;

    // 2. Sincronitzar línies i impostos (Calculant base de línia)
    const itemsResult = await _syncInvoiceItems(
        supabase,
        resultingInvoiceId,
        invoice_items || [],
        userId,
        teamId,
    );
    if (itemsResult.error) {
        return { success: false, message: itemsResult.error, data: { id: resultingInvoiceId } };
    }
    
    // 3. Actualitzar totals globals (Calculant totals finals)
    const totalsResult = await _updateInvoiceTotals(
        supabase,
        resultingInvoiceId,
        invoice_items || [],
        Number(invoiceData.discount_amount) || 0,
        Number(invoiceData.shipping_cost) || 0,
    );
    if (totalsResult.error) {
        console.warn(`Factura ${resultingInvoiceId} desada, però error actualitzant totals: ${totalsResult.error}`);
    }
    
    return {
        success: true,
        message: "Factura desada correctament.",
        data: { id: resultingInvoiceId },
    };
}

// ... (deleteInvoice, uploadAttachment, getAttachmentSignedUrl, deleteAttachment MANTINGUTS IGUALS)
// ... Només els copio per assegurar que el fitxer estigui complet com demanaves

export async function deleteInvoice(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    teamId: string,
): Promise<ActionResult> {
  const { data: invoiceStatus, error: statusError } = await supabase
      .from("invoices")
      .select("status")
      .eq("id", invoiceId)
      .eq("team_id", teamId)
      .single();
  if (statusError) {
      return {
          success: false,
          message: "Factura no trobada o accés denegat.",
      };
  }
  if (invoiceStatus.status !== "Draft") {
      return {
          success: false,
          message:
              "No es pot esborrar una factura que ja ha estat emesa. Només esborranys.",
      };
  }
  const supabaseAdmin = createAdminClient();
  const { data: attachments, error: attachError } = await supabase
      .from("invoice_attachments")
      .select("id, file_path")
      .eq("invoice_id", invoiceId);
  if (attachError) {
      console.error(
          "Error obtenint adjunts per esborrar:",
          attachError.message,
      );
  }
  if (attachments && attachments.length > 0) {
      const filePaths = attachments.map((a) => a.file_path).filter((
          p,
      ): p is string => p !== null);
      if (filePaths.length > 0) {
          const { error: storageError } = await supabaseAdmin.storage.from(
              "factures-adjunts",
          ).remove(filePaths);
          if (storageError) {
              console.warn(
                  "Error esborrant adjunts de Storage:",
                  storageError.message,
              );
          }
      }
  }
  const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId)
      .eq("team_id", teamId);
  if (deleteError) {
      return {
          success: false,
          message: `Error esborrant factura: ${deleteError.message}`,
      };
  }
  return { success: true, message: "Factura esborrada." };
}

export async function uploadAttachment(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    teamId: string,
    formData: FormData,
): Promise<ActionResult<{ newAttachment: InvoiceAttachment }>> {
  const file = formData.get("file") as File | null;
  if (!file) {
      return { success: false, message: "No s'ha proporcionat cap fitxer." };
  }
  const { data: invoiceCheckData, error: invoiceCheckError } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", invoiceId)
      .eq("team_id", teamId)
      .maybeSingle();
  if (invoiceCheckError || !invoiceCheckData) {
      return {
          success: false,
          message: "Factura no trobada o accés denegat.",
      };
  }
  const filePath =
      `${teamId}/invoices/${invoiceId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(
      "factures-adjunts",
  ).upload(filePath, file);
  if (uploadError) {
      return {
          success: false,
          message: `Error pujant a Storage: ${uploadError.message}`,
      };
  }
  
  const attachmentData: DbTableInsert<'invoice_attachments'> = {
      invoice_id: invoiceId,
      file_path: filePath,
      filename: file.name,
      mime_type: file.type,
      team_id: teamId,
  };
  const { data: dbData, error: dbError } = await supabase
      .from("invoice_attachments")
      .insert(attachmentData)
      .select()
      .single();
  if (dbError) {
      await supabase.storage.from("factures-adjunts").remove([filePath]);
      return {
          success: false,
          message: `Error desant adjunt a BD: ${dbError.message}`,
      };
  }
  return {
      success: true,
      message: "Adjunt pujat correctament.",
      data: { newAttachment: dbData as InvoiceAttachment },
  };
}

export async function getAttachmentSignedUrl(
    teamId: string,
    filePath: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  if (
      !filePath || typeof filePath !== "string" ||
      !filePath.startsWith(`${teamId}/`)
  ) {
      return {
          success: false,
          message: "Ruta de fitxer invàlida o accés denegat.",
      };
  }
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.storage
      .from("factures-adjunts")
      .createSignedUrl(filePath, 300); 
  if (error) {
      return {
          success: false,
          message: `Error generant URL signada: ${error.message}`,
      };
  }
  return {
      success: true,
      message: "URL signada generada.",
      data: { signedUrl: data.signedUrl },
  };
}

export async function deleteAttachment(
    supabase: SupabaseClient<Database>,
    teamId: string,
    attachmentId: string,
    filePath: string | null,
): Promise<ActionResult> {
  if (!attachmentId) {
      return { success: false, message: "Falta l'ID de l'adjunt." };
  }
  const { data: attachment, error: fetchError } = await supabase
      .from("invoice_attachments")
      .select("id, file_path, team_id, invoice_id")
      .eq("id", attachmentId)
      .single();
  if (fetchError || !attachment) {
      return { success: false, message: "Adjunt no trobat." };
  }
  if (attachment.team_id !== teamId) {
      return { success: false, message: "Accés denegat." };
  }
  const finalFilePath = filePath || attachment.file_path;
  const { error: dbError } = await supabase.from("invoice_attachments")
      .delete().eq("id", attachmentId);
  if (dbError) {
      return {
          success: false,
          message: `Error esborrant adjunt de BD: ${dbError.message}`,
      };
  }
  if (finalFilePath) {
      const supabaseAdmin = createAdminClient();
      const { error: storageError } = await supabaseAdmin.storage.from(
          "factures-adjunts",
      ).remove([finalFilePath]);
      if (storageError) {
          console.warn(
              `Adjunt ${attachmentId} esborrat de BD, però error esborrant de Storage: ${storageError.message}`,
          );
      }
  }
  return { success: true, message: "Adjunt eliminat correctament." };
}

export async function finalizeInvoice(
    supabase: SupabaseClient,
    invoiceId: number,
    teamId: string,
): Promise<ActionResult<{ signature: string }>> {
    const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, invoice_items (*)")
        .eq("id", invoiceId)
        .eq("team_id", teamId)
        .single();
    if (invoiceError) return { success: false, message: "Factura no trobada." };
    if (invoiceData.status !== "Draft") {
        return {
            success: false,
            message: "Aquesta factura ja ha estat emesa.",
        };
    }
    const { data: lastSignatureData, error: lastSignatureError } =
        await supabase
            .from("invoices")
            .select("verifactu_signature")
            .eq("team_id", teamId)
            .not("sent_at", "is", null)
            .order("sent_at", { ascending: false })
            .limit(1)
            .maybeSingle();
    if (lastSignatureError) {
        return {
            success: false,
            message: "No s'ha pogut obtenir l'historial de signatures.",
        };
    }
    const previousSignature = lastSignatureData?.verifactu_signature || null;
    const { companyProfile, contact } = await _getInvoiceContext(
        supabase,
        teamId,
        invoiceData.contact_id,
    );
    if (!companyProfile) {
        return {
            success: false,
            message: "No s'ha pogut trobar el perfil de la teva empresa.",
        };
    }
    if (!contact) {
        return {
            success: false,
            message: "No s'ha pogut trobar el contacte de la factura.",
        };
    }
    const clientAddressParts = [
        contact.street, 
        contact.city, 
        contact.postal_code, 
        contact.country, 
    ];
    const fullClientAddress = clientAddressParts.filter(Boolean).join(", ");
    const lockedInvoiceData = {
        company_name: companyProfile.company_name,
        company_address: companyProfile.company_address,
        company_tax_id: companyProfile.company_tax_id,
        company_email: companyProfile.company_email,
        company_logo_url: companyProfile.logo_url,
        client_name: contact.nom,
        client_address: fullClientAddress || contact.ubicacio || null,
        client_email: contact.email,
        client_tax_id: contact.tax_id || null, 
    };
    console.warn(
        `[finalizeInvoice] SIMULACIÓ VeriFactu per a factura ID: ${invoiceId}`,
    );
    const uuid = crypto.randomUUID();
    const signaturePayload = `${invoiceId}|${new Date().toISOString()}|${
        previousSignature || "START"
    }`;
    const signature = crypto.createHash("sha256").update(signaturePayload)
        .digest("hex");
    const qrData = `https://www.agenciatributaria.es/qr?id=${uuid}&nif_em=${
        lockedInvoiceData.company_tax_id || "SIN_NIF"
    }&nif_re=${lockedInvoiceData.client_tax_id || "SIN_NIF"}&i=${
        invoiceData.invoice_number || invoiceId
    }&f=${invoiceData.issue_date}&t=${invoiceData.total_amount}`;
    const verifactuResult = {
        success: true,
        data: { uuid, qrData, signature },
    };
    const { error: updateError } = await supabase
        .from("invoices")
        .update({
            status: "Sent",
            sent_at: new Date().toISOString(),
            verifactu_uuid: verifactuResult.data.uuid, 
            verifactu_signature: verifactuResult.data.signature,
            verifactu_previous_signature: previousSignature,
            verifactu_qr_data: verifactuResult.data.qrData,
            ...lockedInvoiceData,
        })
        .eq("id", invoiceId)
        .eq("team_id", teamId)
        .eq("status", "Draft");
    if (updateError) {
        console.error(
            "Error crític actualitzant BBDD post-VeriFactu:",
            updateError,
        );
        return {
            success: false,
            message:
                `Error crític: La factura s'ha registrat (simuladament) (ID: ${verifactuResult.data.uuid}) però no s'ha pogut guardar a la BBDD. Detall: ${updateError.message}`,
        };
    }
    return {
        success: true,
        message: "Factura emesa i registrada (Simulació).",
        data: { signature: verifactuResult.data.signature },
    };
}

export async function sendInvoiceByEmail(
    supabase: SupabaseClient, 
    invoiceId: number,
    teamId: string,
    recipientEmail: string, 
    messageBody: string,
): Promise<ActionResult> {
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
         return { success: false, message: "Usuari no autenticat." };
    }
    const userId = user.id;

    // 1. Obtenir factura
    const invoiceData = (await fetchInvoiceDetail(invoiceId)) as InvoiceDetail;
    if (!invoiceData) return { success: false, message: "Factura no trobada." };
    if (invoiceData.team_id !== teamId) {
        return { success: false, message: "No tens permís." };
    }
    if (invoiceData.status === "Draft") {
        return { success: false, message: "No es pot enviar un esborrany." };
    }

    // 2. Obtenir context (Emissor)
    const companyProfileResult = await getCompanyProfile(supabase, teamId);
    if (!companyProfileResult) {
        return { success: false, message: "No s'ha pogut trobar el perfil de la teva empresa." };
    }
    const companyProfile: CompanyProfile = companyProfileResult;

    // 3. Lògica de Contacte
    let finalContactId: number;
    const email = recipientEmail.trim().toLowerCase();
    
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, nom, email')
      .eq('email', email)
      .eq('team_id', teamId)
      .maybeSingle();

    if (existingContact) {
      finalContactId = existingContact.id;
    } else {
      const newContactData: DbTableInsert<'contacts'> = {
        team_id: teamId,
        email: email,
        nom: email.split('@')[0] || 'Nou Contacte (Factura)',
        user_id: userId 
      };
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert(newContactData)
        .select('id')
        .single();
        
      if (createError) {
        console.error("Error creant contacte manualment (invoice.service):", createError);
        throw new Error(`No s'ha pogut crear el contacte: ${createError.message}`);
      }
      finalContactId = newContact.id;
    }

    // 4. Generar PDF
    const contactForPdf: Contact = invoiceData.contact_id !== null
        ? await getContactById(supabase, teamId, invoiceData.contact_id)
        : null;

    let pdfBuffer: Buffer;
    try {
        pdfBuffer = await generateInvoicePdfBuffer(
            invoiceData,
            companyProfile,
            contactForPdf 
        );
    } catch (error) {
        console.error("Error generant el PDF al servidor:", error);
        return {
            success: false,
            message: (error as Error).message || "No s'ha pogut generar el PDF.",
        };
    }

    // 5. Enviar Email (Edge Function)
    const fileName = `factura-${
        invoiceData.invoice_number || invoiceData.id
    }.pdf`;
    
    const emailSubject = `Nova Factura: ${invoiceData.invoice_number || invoiceId} de ${companyProfile.company_name || 'la teva empresa'}`;
    const pdfBase64 = pdfBuffer.toString('base64');

    try {
        const { error: invokeError } = await supabase.functions.invoke('send-email', {
          body: {
            contactId: finalContactId,
            subject: emailSubject,
            htmlBody: messageBody,
            attachments: [{
              filename: fileName,
              content: pdfBase64,
              contentType: "application/pdf",
              encoding: 'base64'
            }]
          }
        });

        if (invokeError) {
             console.error("Error invocant la Edge Function 'send-email':", invokeError);
             return { 
                success: false, 
                message: invokeError.message.includes('credentials') 
                  ? "Error d'autenticació. Si us plau, reconnecta el teu compte de correu a la secció d'Integracions."
                  : `Error en el servei d'enviament: ${invokeError.message}` 
            };
        }

    } catch (error) {
        console.error("Error catastròfic invocant 'send-email':", error);
        return {
            success: false,
            message: "Error en el servei d'enviament d'email.",
        };
    }

    // 6. Registrar lliurament
    if (process.env.NODE_ENV !== "development") {
        try {
            await supabase.from("invoice_deliveries").insert({
                invoice_id: invoiceId,
                team_id: teamId,
                method: "email",
                recipient: recipientEmail, 
            });
        } catch (dbError) {
            console.warn("No s'ha pogut registrar el lliurament:", dbError);
        }
    }

    return { success: true, message: `Factura enviada a ${recipientEmail}.` };
}