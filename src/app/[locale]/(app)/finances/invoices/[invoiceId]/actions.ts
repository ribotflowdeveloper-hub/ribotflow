"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/index";
import {
    type InvoiceItem,
    type InvoiceAttachment,
    type InvoiceFormDataForAction,
} from '@/types/finances/invoices';

// ✅ PAS 1: Importem el nostre nou servei
import * as invoiceService from '@/lib/services/finances/invoices/invoicesDetail.service';

/**
 * ACCIÓ: Desa una factura (capçalera, línies i totals).
 */
export async function saveInvoiceAction(
  formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
  invoiceId: number | null
): Promise<ActionResult<{ id: number }>> {
  
  // 1. Validació
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  // 2. Delegació (crida al servei)
  const result = await invoiceService.saveInvoice(
    supabase,
    formData,
    invoiceId,
    user.id,
    activeTeamId
  );

  // 3. Revalidació (si èxit)
  if (result.success && result.data?.id) {
    revalidatePath('/finances/invoices');
    revalidatePath(`/finances/invoices/${result.data.id}`);
  }

  return result;
}

/**
 * ACCIÓ: Esborra una factura (només si és 'Draft').
 */
export async function deleteInvoiceAction(invoiceId: number): Promise<ActionResult> {
  // 1. Validació
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // 2. Delegació
  const result = await invoiceService.deleteInvoice(supabase, invoiceId, activeTeamId);

  // 3. Revalidació
  if (result.success) {
    revalidatePath('/finances/invoices');
  }

  return result;
}

/**
 * ACCIÓ: Puja un adjunt.
 */
export async function uploadInvoiceAttachmentAction(
    invoiceId: number,
    formData: FormData
): Promise<ActionResult<{ newAttachment: InvoiceAttachment }>> {
  
  // 1. Validació
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // 2. Delegació
  const result = await invoiceService.uploadAttachment(supabase, invoiceId, activeTeamId, formData);

  // 3. Revalidació
  if (result.success) {
    revalidatePath(`/finances/invoices/${invoiceId}`);
  }
  
  return result;
}

/**
 * ACCIÓ: Obté una URL signada per a un adjunt.
 */
export async function getInvoiceAttachmentSignedUrl(filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
  // 1. Validació
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { activeTeamId } = session;

  // 2. Delegació
  // Aquesta acció no necessita el client 'supabase' de sessió, només 'teamId' per seguretat
  return invoiceService.getAttachmentSignedUrl(activeTeamId, filePath);
}

/**
 * ACCIÓ: Esborra un adjunt.
 */
export async function deleteInvoiceAttachmentAction(
    attachmentId: string,
    filePath: string | null
): Promise<ActionResult> {

  // 1. Validació
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // 2. Delegació
  const result = await invoiceService.deleteAttachment(supabase, activeTeamId, attachmentId, filePath);

  // 3. Revalidació (El camí es revalida dins del servei si és necessari)
  // Per coherència, ho fem aquí:
  if (result.success) {
      // Necessitaríem l'invoiceId de tornada, però per ara revalidem la llista
      revalidatePath('/finances/invoices');
      // Idealment, el servei retornaria l'invoiceId per revalidar específicament
  }

  return result;
}

/**
 * ACCIÓ: Finalitza una factura (VeriFactu).
 */
export async function finalizeInvoiceAction(
  invoiceId: number,
): Promise<ActionResult<{ signature: string }>> {

  // 1. Validació
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // 2. Delegació
  const result = await invoiceService.finalizeInvoice(supabase, invoiceId, activeTeamId);

  // 3. Revalidació
  if (result.success) {
    revalidatePath('/finances/invoices');
    revalidatePath(`/finances/invoices/${invoiceId}`);
  }

  return result;
}

/**
 * ACCIÓ: Envia la factura per email (PDF + Resend).
 */
export async function sendInvoiceByEmailAction(
  invoiceId: number,
  recipientEmail: string,
): Promise<ActionResult> {

  // 1. Validació
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // 2. Delegació
  const result = await invoiceService.sendInvoiceByEmail(
    supabase,
    invoiceId,
    activeTeamId,
    recipientEmail
  );

  // 3. Revalidació (Opcional, potser registrar una activitat)
  if (result.success) {
      revalidatePath(`/finances/invoices/${invoiceId}`); // Per veure l'activitat d'enviament
  }

  return result;
}