"use server";

import { type SupabaseClient } from "@supabase/supabase-js";

import { type InvoiceDetail } from "@/types/finances/invoices";
import { type ActionResult } from "@/types/shared/index";

import { generateInvoicePdfBuffer } from "@/lib/pdf/generateInvoicePDF";
import { getContactById } from "@/lib/services/crm/contacts/contacts.service";
import { getCompanyProfile } from "@/lib/services/settings/team/team.service";
import { fetchInvoiceDetail } from "@/app/[locale]/(app)/finances/invoices/[invoiceId]/_hooks/fetchInvoiceDetail";
import { getInvoiceContext } from "./helpers"; // Importem el helper intern
import crypto from "crypto";

export async function finalizeInvoice(
    supabase: SupabaseClient,
    invoiceId: number,
    teamId: string,
): Promise<ActionResult<{ signature: string }>> {
    
    // 1. Validacions prèvies
    const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, invoice_items (*)")
        .eq("id", invoiceId)
        .eq("team_id", teamId)
        .single();

    if (invoiceError || !invoiceData) return { success: false, message: "Factura no trobada." };
    if (invoiceData.status !== "Draft") return { success: false, message: "Ja està emesa." };

    // 2. Obtenir dades denormalització
    const { companyProfile, contact } = await getInvoiceContext(supabase, teamId, invoiceData.contact_id);
    if (!companyProfile || !contact) return { success: false, message: "Falten dades d'empresa o contacte." };

    // 3. Lògica VeriFactu (Simulació)
    const { data: lastSignatureData } = await supabase
        .from("invoices")
        .select("verifactu_signature")
        .eq("team_id", teamId)
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const previousSignature = lastSignatureData?.verifactu_signature || "START";
    const uuid = crypto.randomUUID();
    const signaturePayload = `${invoiceId}|${new Date().toISOString()}|${previousSignature}`;
    const signature = crypto.createHash("sha256").update(signaturePayload).digest("hex");

    const lockedInvoiceData = {
        company_name: companyProfile.company_name,
        company_address: companyProfile.company_address,
        company_tax_id: companyProfile.company_tax_id,
        company_email: companyProfile.company_email,
        company_logo_url: companyProfile.logo_url,
        client_name: contact.nom,
        client_address: [contact.street, contact.city, contact.postal_code, contact.country].filter(Boolean).join(", "),
        client_email: contact.email,
        client_tax_id: contact.tax_id || null, 
    };

    const qrData = `https://www.agenciatributaria.es/qr?id=${uuid}&nif_em=${lockedInvoiceData.company_tax_id}&t=${invoiceData.total_amount}`;

    // 4. Actualització Final
    const { error: updateError } = await supabase
        .from("invoices")
        .update({
            status: "Sent",
            sent_at: new Date().toISOString(),
            verifactu_uuid: uuid, 
            verifactu_signature: signature,
            verifactu_previous_signature: previousSignature,
            verifactu_qr_data: qrData,
            ...lockedInvoiceData,
        })
        .eq("id", invoiceId);

    if (updateError) {
        console.error("[finalizeInvoice] Error:", updateError);
        return { success: false, message: "Error guardant l'emissió." };
    }

    return { success: true, message: "Factura emesa correctament.", data: { signature } };
}

export async function sendInvoiceByEmail(
    supabase: SupabaseClient, 
    invoiceId: number,
    teamId: string,
    recipientEmail: string, 
    messageBody: string,
): Promise<ActionResult> {
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    // 1. Dades
    const invoiceData = (await fetchInvoiceDetail(invoiceId)) as InvoiceDetail;
    if (!invoiceData || invoiceData.team_id !== teamId) return { success: false, message: "Error carregant factura." };
    if (invoiceData.status === "Draft") return { success: false, message: "No es pot enviar un esborrany." };

    const companyProfile = await getCompanyProfile(supabase, teamId);
    if (!companyProfile) return { success: false, message: "Perfil d'empresa no trobat." };

    // 2. Generar PDF
    const contactForPdf = invoiceData.contact_id ? await getContactById(supabase, teamId, invoiceData.contact_id) : null;
    
    let pdfBuffer: Buffer;
    try {
        pdfBuffer = await generateInvoicePdfBuffer(invoiceData, companyProfile, contactForPdf);
    } catch (e) {
        console.error("PDF Error:", e);
        return { success: false, message: "Error generant PDF." };
    }

    // 3. Gestionar Contacte destí (Inbox Logic)
    let finalContactId: number;
    const email = recipientEmail.trim().toLowerCase();
    const { data: existingContact } = await supabase.from('contacts').select('id').eq('email', email).eq('team_id', teamId).maybeSingle();

    if (existingContact) {
        finalContactId = existingContact.id;
    } else {
        const { data: newContact, error: createError } = await supabase
            .from('contacts')
            .insert({ team_id: teamId, email, nom: email.split('@')[0], user_id: user.id })
            .select('id')
            .single();
        if (createError) return { success: false, message: "Error creant contacte." };
        finalContactId = newContact.id;
    }

    // 4. Enviar (Edge Function)
    try {
        const { error: invokeError } = await supabase.functions.invoke('send-email', {
          body: {
            contactId: finalContactId,
            subject: `Factura: ${invoiceData.invoice_number} de ${companyProfile.company_name}`,
            htmlBody: messageBody,
            attachments: [{
              filename: `factura-${invoiceData.invoice_number}.pdf`,
              content: pdfBuffer.toString('base64'),
              contentType: "application/pdf",
              encoding: 'base64'
            }]
          }
        });
        
        if (invokeError) throw new Error(invokeError.message);

        // Log
        if (process.env.NODE_ENV !== "development") {
            await supabase.from("invoice_deliveries").insert({
                invoice_id: invoiceId, team_id: teamId, method: "email", recipient: recipientEmail
            });
        }

        return { success: true, message: `Enviat a ${recipientEmail}.` };
    } catch (error: unknown) {
        console.error("Email Error:", error);
        return { success: false, message: "Error enviant l'email." };
    }
}