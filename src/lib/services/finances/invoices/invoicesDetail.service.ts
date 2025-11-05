import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from '@/types/supabase';
import { createAdminClient } from "@/lib/supabase/admin";
// ✅ 1. IMPORTEM EL MÒDUL 'crypto' Natiu
import crypto from 'crypto'; 
import { 
    type InvoiceDetail,
    type InvoiceItem,
    type InvoiceAttachment,
    type InvoiceFormDataForAction,
    type InvoiceRow,
    type InvoiceAttachmentRow 
} from '@/types/finances/invoices';
import { type ActionResult } from "@/types/shared/index";
import { Resend } from 'resend';
import { generateInvoicePdfBuffer } from '@/lib/pdf/generateInvoicePDF';
import { registerInvoiceWithHacienda } from '@/lib/verifactu/service';

// Importem serveis que ja tenim per ser DRY (Do not Repeat Yourself)
import { getCompanyProfile } from '@/lib/services/settings/team/team.service';
import { getContactById } from '@/lib/services/crm/contacts/contacts.service'; // Assumim que aquest servei existeix
import { fetchInvoiceDetail } from "@/app/[locale]/(app)/finances/invoices/[invoiceId]/_hooks/fetchInvoiceDetail"; // Movem l'import aquí

// Tipus locals
type Contact = Database['public']['Tables']['contacts']['Row'] | null;


// --- Funcions Internes del Servei (No exportades) ---

/**
 * Funció auxiliar interna per desar la capçalera de la factura.
 */
async function _upsertInvoiceHeader(
    supabase: SupabaseClient,
    invoiceData: InvoiceFormDataForAction,
    invoiceId: number | null,
    userId: string,
    teamId: string
): Promise<{ id: number; error: string | null }> {
    const dataToUpsert: Partial<InvoiceRow> = {
        contact_id: invoiceData.contact_id || null,
        budget_id: invoiceData.budget_id || null,
        quote_id: invoiceData.quote_id || null,
        project_id: invoiceData.project_id || null,
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
    };

    let query;
    if (invoiceId) {
        query = supabase.from('invoices').update(dataToUpsert).eq('id', invoiceId).eq('team_id', teamId);
    } else {
        query = supabase.from('invoices').insert({
            ...dataToUpsert,
            user_id: userId,
            team_id: teamId,
            total_amount: 0,
            subtotal: 0,
            tax_amount: 0,
        });
    }

    const { data, error } = await query.select('id').single();

    if (error) {
        console.error("Error upserting invoice header:", error);
        return { id: 0, error: `Error desant capçalera: ${error.message ?? 'Error desconegut'}` };
    }
    if (!data?.id) {
        return { id: 0, error: "No s'ha pogut obtenir l'ID de la factura." };
    }
    return { id: data.id, error: null };
}

/**
 * Funció auxiliar interna per sincronitzar les línies de la factura.
 */
async function _syncInvoiceItems(
    supabase: SupabaseClient,
    invoiceId: number,
    items: InvoiceItem[],
    userId: string,
    teamId: string
): Promise<{ calculatedSubtotal: number; calculatedTotalLineDiscount: number; error: string | null }> {
    
    let calculatedSubtotal = 0;
    let calculatedTotalLineDiscount = 0;

    const { data: existingDbItems, error: fetchError } = await supabase
        .from('invoice_items')
        .select('id')
        .eq('invoice_id', invoiceId)
        .returns<{ id: string }[]>();

    if (fetchError) return { calculatedSubtotal: 0, calculatedTotalLineDiscount: 0, error: `Error obtenint items antics: ${fetchError.message}` };

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

        // Lògica per determinar si és un ID nou
        const isNewId = !item.id || 
                        (typeof item.id === 'string' && 
                            (item.id.startsWith('temp-') || item.id === 'null')
                        );

        return {
           // ✅ 2. *** CORRECCIÓ DEFINITIVA ***
           // Si és un ID nou/invàlid, generem un UUID nou aquí mateix.
           // Altrament, fem servir l'ID existent (string UUID) per l'UPDATE.
           id: isNewId ? crypto.randomUUID() : item.id,
           invoice_id: invoiceId,
           user_id: userId,
           team_id: teamId,
           product_id: item.product_id ? Number(item.product_id) : null,
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
        // En fer 'upsert', els items amb 'id' nou es crearan (INSERT)
        // i els items amb 'id' existent s'actualitzaran (UPDATE).
        const { error: upsertError } = await supabase.from('invoice_items').upsert(itemsToUpsert, { onConflict: 'id' });
        if (upsertError) {
             console.error("Error upserting invoice items:", upsertError);
            return { calculatedSubtotal: 0, calculatedTotalLineDiscount: 0, error: `Error actualitzant línies: ${upsertError.message}` };
        }
    }

    if (itemsToDeleteIds.length > 0) {
        const { error: deleteError } = await supabase.from('invoice_items').delete().in('id', itemsToDeleteIds);
        if (deleteError) {
            console.error("Error deleting old invoice items:", deleteError);
            return { calculatedSubtotal: 0, calculatedTotalLineDiscount: 0, error: `Error esborrant línies antigues: ${deleteError.message}` };
        }
    }

    return { calculatedSubtotal, calculatedTotalLineDiscount, error: null };
}

/**
 * Funció auxiliar interna per actualitzar els totals de la factura.
 */
async function _updateInvoiceTotals(
    supabase: SupabaseClient,
    invoiceId: number,
    subtotal: number,
    totalLineDiscount: number,
    generalDiscount: number,
    taxRate: number,
    shippingCost: number
): Promise<{ error: string | null }> {
    
   const subtotalAfterLineDiscounts = subtotal - totalLineDiscount;
   const effectiveSubtotal = subtotalAfterLineDiscounts - generalDiscount;
   const calculatedTaxRate = taxRate || 0;
   const taxAmount = effectiveSubtotal > 0 ? effectiveSubtotal * (calculatedTaxRate / 100) : 0;
   const totalAmount = effectiveSubtotal + taxAmount + shippingCost;

   const { error } = await supabase
       .from('invoices')
       .update({
           subtotal: subtotal,
           tax_amount: taxAmount,
           total_amount: totalAmount,
           shipping_cost: shippingCost,
       })
       .eq('id', invoiceId);

    if (error) {
        console.error("Error updating invoice totals:", error);
        return { error: `Error actualitzant totals: ${error.message}` };
    }
    return { error: null };
}

/**
 * Funció auxiliar interna per obtenir dades de context (Emissor/Receptor)
 */
async function _getInvoiceContext(supabase: SupabaseClient, teamId: string, contactId: number | null) {
    const companyProfile = await getCompanyProfile(supabase, teamId);

    let contact: Contact = null;
    if (contactId) {
        // Reutilitzem el servei de contactes
        contact = await getContactById(supabase, teamId, contactId); 
    }
    
    return { companyProfile, contact };
}


// --- Serveis Principals (Exportats per a les Accions) ---

/**
 * SERVEI: Desa una factura (capçalera, línies i totals).
 */
export async function saveInvoice(
    supabase: SupabaseClient,
    formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
    invoiceId: number | null,
    userId: string,
    teamId: string
): Promise<ActionResult<{ id: number }>> {
    
    const { invoice_items, ...invoiceData } = formData;

    const invoiceResult = await _upsertInvoiceHeader(supabase, invoiceData, invoiceId, userId, teamId);

    if (invoiceResult.error || !invoiceResult.id) {
        return { success: false, message: invoiceResult.error || "Error desant la capçalera." };
    }
    const resultingInvoiceId = invoiceResult.id;

    const itemsResult = await _syncInvoiceItems(supabase, resultingInvoiceId, invoice_items || [], userId, teamId);

    if (itemsResult.error) {
        return { success: false, message: itemsResult.error, data: { id: resultingInvoiceId } };
    }
    
    const { calculatedSubtotal, calculatedTotalLineDiscount } = itemsResult;

    const totalsResult = await _updateInvoiceTotals(
        supabase,
        resultingInvoiceId,
        calculatedSubtotal,
        calculatedTotalLineDiscount,
        Number(invoiceData.discount_amount),
        Number(invoiceData.tax_rate),
        Number(invoiceData.shipping_cost)
    );

    if (totalsResult.error) {
        console.warn(`Factura ${resultingInvoiceId} desada, però error actualitzant totals: ${totalsResult.error}`);
    }

    return { success: true, message: "Factura desada correctament.", data: { id: resultingInvoiceId } };
}

/**
 * SERVEI: Esborra una factura (lògica de negoci + dades).
 */
export async function deleteInvoice(supabase: SupabaseClient, invoiceId: number, teamId: string): Promise<ActionResult> {
    const { data: invoiceStatus, error: statusError } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', invoiceId)
        .eq('team_id', teamId)
        .single();

    if (statusError) {
        return { success: false, message: "Factura no trobada o accés denegat." };
    }

    if (invoiceStatus.status !== 'Draft') {
        return { success: false, message: "No es pot esborrar una factura que ja ha estat emesa. Només esborranys." };
    }

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
    }

    const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('team_id', teamId);

    if (deleteError) {
        return { success: false, message: `Error esborrant factura: ${deleteError.message}` };
    }

    return { success: true, message: "Factura esborrada." };
}

/**
 * SERVEI: Puja un adjunt.
 */
export async function uploadAttachment(
    supabase: SupabaseClient,
    invoiceId: number,
    teamId: string,
    formData: FormData
): Promise<ActionResult<{ newAttachment: InvoiceAttachment }>> {
    const file = formData.get("file") as File | null;
    if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." };

    const { data: invoiceCheckData, error: invoiceCheckError } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', invoiceId)
        .eq('team_id', teamId)
        .maybeSingle();

    if(invoiceCheckError || !invoiceCheckData) {
        return { success: false, message: "Factura no trobada o accés denegat." };
    }

    const filePath = `${teamId}/invoices/${invoiceId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("factures-adjunts").upload(filePath, file);
    if (uploadError) {
        return { success: false, message: `Error pujant a Storage: ${uploadError.message}` };
    }

    const attachmentData: Partial<InvoiceAttachmentRow> = {
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
        return { success: false, message: `Error desant adjunt a BD: ${dbError.message}` };
    }

    return {
        success: true,
        message: "Adjunt pujat correctament.",
        data: { newAttachment: dbData as InvoiceAttachment }
    };
}

/**
 * SERVEI: Obté una URL signada per a un adjunt.
 */
export async function getAttachmentSignedUrl(teamId: string, filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
    if (!filePath || typeof filePath !== 'string' || !filePath.startsWith(`${teamId}/`)) {
        return { success: false, message: "Ruta de fitxer invàlida o accés denegat." };
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage
        .from('factures-adjunts')
        .createSignedUrl(filePath, 300); // 5 minuts de validesa

    if (error) {
        return { success: false, message: `Error generant URL signada: ${error.message}` };
    }
    
    return { success: true, message: "URL signada generada.", data: { signedUrl: data.signedUrl } };
}

/**
 * SERVEI: Esborra un adjunt.
 */
export async function deleteAttachment(
    supabase: SupabaseClient,
    teamId: string,
    attachmentId: string,
    filePath: string | null
): Promise<ActionResult> {
    if (!attachmentId) return { success: false, message: "Falta l'ID de l'adjunt."};

    const { data: attachment, error: fetchError } = await supabase
        .from('invoice_attachments')
        .select('id, file_path, team_id, invoice_id')
        .eq('id', attachmentId)
        .single();

    if (fetchError || !attachment) {
        return { success: false, message: "Adjunt no trobat." };
    }
    if (attachment.team_id !== teamId) {
        return { success: false, message: "Accés denegat." };
    }

    const finalFilePath = filePath || attachment.file_path;

    const { error: dbError } = await supabase.from('invoice_attachments').delete().eq('id', attachmentId);
    if (dbError) {
        return { success: false, message: `Error esborrant adjunt de BD: ${dbError.message}` };
    }

    if (finalFilePath) {
        const supabaseAdmin = createAdminClient();
        const { error: storageError } = await supabaseAdmin.storage.from('factures-adjunts').remove([finalFilePath]);
        if (storageError) {
            console.warn(`Adjunt ${attachmentId} esborrat de BD, però error esborrant de Storage: ${storageError.message}`);
        }
    }

    return { success: true, message: "Adjunt eliminat correctament." };
}

/**
 * SERVEI: Finalitza una factura (VeriFactu).
 */
export async function finalizeInvoice(
    supabase: SupabaseClient, 
    invoiceId: number, 
    teamId: string
): Promise<ActionResult<{ signature: string }>> {
    
    // 1. Obtenir factura
    const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, invoice_items (*)')
        .eq('id', invoiceId)
        .eq('team_id', teamId)
        .single();

    if (invoiceError) return { success: false, message: 'Factura no trobada.' };
    if (invoiceData.status !== 'Draft') return { success: false, message: 'Aquesta factura ja ha estat emesa.' };

    // 2. Obtenir signatura anterior
    const { data: lastSignatureData, error: lastSignatureError } = await supabase
        .from('invoices')
        .select('verifactu_signature')
        .eq('team_id', teamId)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastSignatureError) {
        return { success: false, message: "No s'ha pogut obtenir l'historial de signatures." };
    }
    const previousSignature = lastSignatureData?.verifactu_signature || null;

    // 3. Obtenir context (Emissor i Receptor)
    const { companyProfile, contact } = await _getInvoiceContext(supabase, teamId, invoiceData.contact_id);

    if (!companyProfile) {
        return { success: false, message: "No s'ha pogut trobar el perfil de la teva empresa." };
    }
    if (!contact) {
        return { success: false, message: "No s'ha pogut trobar el contacte de la factura." };
    }
    
    // 3c. Preparar dades "bloquejades"
    const lockedInvoiceData = {
        company_name: companyProfile.company_name,
        company_address: companyProfile.company_address,
        company_tax_id: companyProfile.company_tax_id,
        company_email: companyProfile.company_email,
        company_logo_url: companyProfile.logo_url,
        
        client_name: contact.nom,
        client_address: contact.address, // Camp correcte d'esquema.sql
        client_email: contact.email,
    };

    const fullInvoiceForAPI = { ...invoiceData, ...lockedInvoiceData };

    // 4. Crida a VeriFactu
    const verifactuResult = await registerInvoiceWithHacienda(
        fullInvoiceForAPI as InvoiceDetail & { invoice_items: InvoiceItem[] },
        previousSignature
    );

    if (!verifactuResult.success) {
        return { success: false, message: verifactuResult.error };
    }
    const { uuid, qrData, signature } = verifactuResult.data;

    // 5. Actualització final a BBDD
    const { error: updateError } = await supabase
        .from('invoices')
        .update({
            status: 'Sent',
            sent_at: new Date().toISOString(),
            verifactu_uuid: uuid,
            verifactu_signature: signature,
            verifactu_previous_signature: previousSignature,
            verifactu_qr_data: qrData,
            ...lockedInvoiceData,
        })
        .eq('id', invoiceId)
        .eq('team_id', teamId)
        .eq('status', 'Draft'); // Control de concurrència

    if (updateError) {
        return { success: false, message: `Error crític: La factura s'ha registrat a Hisenda (ID: ${uuid}) però no s'ha pogut guardar a la BBDD.` };
    }

    return { success: true, message: 'Factura emesa i registrada.', data: { signature } };
}

/**
 * SERVEI: Envia la factura per email (PDF + Resend).
 */
export async function sendInvoiceByEmail(
    supabase: SupabaseClient,
    invoiceId: number,
    teamId: string,
    recipientEmail: string
): Promise<ActionResult> {
    
    // 1. Obtenir factura
    const invoiceData = (await fetchInvoiceDetail(invoiceId)) as InvoiceDetail;
    if (!invoiceData) return { success: false, message: 'Factura no trobada.' };
    if (invoiceData.team_id !== teamId) return { success: false, message: 'No tens permís.' };
    if (invoiceData.status === 'Draft') {
        return { success: false, message: "No es pot enviar un esborrany." };
    }

    // 2. Obtenir context (Emissor i Receptor)
    const { companyProfile, contact } = await _getInvoiceContext(supabase, teamId, invoiceData.contact_id);

    if (!companyProfile) {
        return { success: false, message: "No s'ha pogut trobar el perfil de la teva empresa." };
    }
    // 'contact' pot ser null si la factura no en té, el PDF ho ha de gestionar.

    // 3. Generar PDF
    let pdfBuffer: Buffer;
    try {
        pdfBuffer = await generateInvoicePdfBuffer(
            invoiceData,
            companyProfile, 
            contact
        );
    } catch (error) {
        console.error('Error generant el PDF al servidor:', error);
        return { success: false, message: (error as Error).message || "No s'ha pogut generar el PDF." };
    }

    // 4. Enviar Email
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fileName = `factura-${invoiceData.invoice_number || invoiceData.id}.pdf`;

    try {
        await resend.emails.send({
            from: 'facturacio@ribotflow.com', // TODO: Fer configurable
            to: recipientEmail,
            subject: `Nova Factura: ${invoiceData.invoice_number}`,
            html: `<p>Adjunt trobaràs la factura ${invoiceData.invoice_number}.</p>`, // TODO: Utilitzar plantilles
            attachments: [{
                filename: fileName,
                content: pdfBuffer,
                contentType: 'application/pdf',
            }],
        });
    } catch (error) {
        console.error("Error enviant email amb Resend:", error);
        return { success: false, message: "Error en el servei d'enviament d'email." };
    }

    // 5. Registrar lliurament
    if (process.env.NODE_ENV !== 'development') {
        try {
            await supabase.from('invoice_deliveries').insert({
                invoice_id: invoiceId,
                team_id: teamId,
                method: 'email',
                recipient: recipientEmail,
            });
        } catch (dbError) {
            console.warn("No s'ha pogut registrar el lliurament:", dbError);
        }
    }

    return { success: true, message: `Factura enviada a ${recipientEmail}.` };
}