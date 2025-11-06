"use server";

import { revalidatePath } from "next/cache";
// ✅ 1. Importem els nous guardians, permisos i el TIPUS PlanLimit
import { 
  validateSessionAndPermission, 
  validateActionAndUsage 
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
// Eliminem la importació errònia de PLAN_LIMITS_IDS
import { type PlanLimit } from "@/config/subscriptions"; 

import { type ActionResult } from "@/types/shared/index";
import {
    type InvoiceItem,
    type InvoiceAttachment,
    type InvoiceFormDataForAction,
} from '@/types/finances/invoices';

import * as invoiceService from '@/lib/services/finances/invoices/invoicesDetail.service';

/**
 * ACCIÓ: Desa una factura (capçalera, línies i totals).
 */
export async function saveInvoiceAction(
  formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
  invoiceId: number | null
): Promise<ActionResult<{ id: number }>> {
  
  let validationResult;

  // ✅ 2. Lògica de validació corregida
  if (invoiceId === null) {
    // És una CREACIÓ. Hem de comprovar permís + límit.
    
    // Utilitzem el string literal. El tipus 'PlanLimit' ho valida.
    const limitToCheck: PlanLimit = 'maxInvoicesPerMonth'; 
    
    console.log(`[saveInvoiceAction] Comprovant límit: ${limitToCheck}`);
    validationResult = await validateActionAndUsage(
      PERMISSIONS.MANAGE_INVOICES,
      limitToCheck // <-- Corregit
    );
  } else {
    // És una ACTUALITZACIÓ. Només comprovem permís.
    validationResult = await validateSessionAndPermission(
      PERMISSIONS.MANAGE_INVOICES
    );
  }

  // 3. Validació
  if ("error" in validationResult) {
    return { success: false, message: validationResult.error.message };
  }
  
  const { supabase, user, activeTeamId } = validationResult;

  // 4. Delegació (crida al servei)
  const result = await invoiceService.saveInvoice(
    supabase,
    formData,
    invoiceId,
    user.id,
    activeTeamId
  );

  // 5. Revalidació (si èxit)
  if (result.success && result.data?.id) {
    revalidatePath('/finances/invoices');
    revalidatePath(`/finances/invoices/${result.data.id}`);
  }

  return result;
}

/**
 * ACCIÓ: Esborra una factura
 */
export async function deleteInvoiceAction(invoiceId: number): Promise<ActionResult> {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await invoiceService.deleteInvoice(supabase, invoiceId, activeTeamId);

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
  
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await invoiceService.uploadAttachment(supabase, invoiceId, activeTeamId, formData);

  if (result.success) {
    revalidatePath(`/finances/invoices/${invoiceId}`);
  }
  
  return result;
}

/**
 * ACCIÓ: Obté una URL signada per a un adjunt.
 */
export async function getInvoiceAttachmentSignedUrl(filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { activeTeamId } = session;

  return invoiceService.getAttachmentSignedUrl(activeTeamId, filePath);
}

/**
 * ACCIÓ: Esborra un adjunt.
 */
export async function deleteInvoiceAttachmentAction(
    attachmentId: string,
    filePath: string | null
): Promise<ActionResult> {

  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await invoiceService.deleteAttachment(supabase, activeTeamId, attachmentId, filePath);

  if (result.success) {
      revalidatePath('/finances/invoices');
  }

  return result;
}

/**
 * ACCIÓ: Finalitza una factura (VeriFactu).
 */
export async function finalizeInvoiceAction(
  invoiceId: number,
): Promise<ActionResult<{ signature: string }>> {

  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await invoiceService.finalizeInvoice(supabase, invoiceId, activeTeamId);

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

  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await invoiceService.sendInvoiceByEmail(
    supabase,
    invoiceId,
    activeTeamId,
    recipientEmail
  );

  if (result.success) {
      revalidatePath(`/finances/invoices/${invoiceId}`);
  }

  return result;
}