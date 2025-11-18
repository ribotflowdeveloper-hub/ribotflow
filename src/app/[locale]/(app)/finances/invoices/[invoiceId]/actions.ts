"use server";

import { revalidatePath } from "next/cache";
import { 
  validateSessionAndPermission, 
  validateActionAndUsage 
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions"; 

import { type ActionResult } from "@/types/shared/index";
import {
    type InvoiceItem,
    type InvoiceAttachment,
    type InvoiceFormDataForAction,
} from '@/types/finances/invoices';

// ✅ ACTUALITZAT: Importem des de la carpeta modular
import * as invoiceService from '@/lib/services/finances/invoices';

/**
 * ACCIÓ: Desa una factura (capçalera, línies i totals).
 */
export async function saveInvoiceAction(
  formData: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] },
  invoiceId: number | null
): Promise<ActionResult<{ id: number }>> {
  
  let validationResult;

  if (invoiceId === null) {
    // Creació: Validem permís + límit
    const limitToCheck: PlanLimit = 'maxInvoicesPerMonth'; 
    validationResult = await validateActionAndUsage(
      PERMISSIONS.MANAGE_INVOICES,
      limitToCheck 
    );
  } else {
    // Edició: Només validem permís
    validationResult = await validateSessionAndPermission(
      PERMISSIONS.MANAGE_INVOICES
    );
  }

  if ("error" in validationResult) {
    return { success: false, message: validationResult.error.message };
  }
  
  const { supabase, user, activeTeamId } = validationResult;

  const result = await invoiceService.saveInvoice(
    supabase,
    formData,
    invoiceId,
    user.id,
    activeTeamId
  );

  if (result.success && result.data?.id) {
    revalidatePath('/finances/invoices');
    revalidatePath(`/finances/invoices/${result.data.id}`);
  }

  return result;
}

/**
 * ACCIÓ: Esborra una factura (individual)
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
 * ACCIÓ: Esborra múltiples factures
 * 🔑 PER QUÈ: Utilitzem .in('id', ids) amb Supabase per fer l'eliminació 
 * en una sola operació optimitzada (ROW-LEVEL SECURITY és crucial).
 */
export async function deleteBulkInvoicesAction(ids: number[]): Promise<ActionResult> {
    // 🔑 PER QUÈ: Validació de permisos (MANAGE_INVOICES) primer de tot per seguretat.
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    if (ids.length === 0) {
        return { success: true, message: "No s'ha seleccionat cap factura per eliminar." };
    }
    
    const { error } = await supabase
        .from('invoices')
        .delete()
        .in('id', ids)
        // 🔑 PER QUÈ: La clàusula .eq('team_id', activeTeamId) és una doble seguretat 
        // per RLS, assegurant que només es poden eliminar factures del teu equip actiu.
        .eq('team_id', activeTeamId); 

    if (error) {
        console.error('Error al realitzar l\'eliminació massiva de factures:', error);
        return { success: false, message: `Error al eliminar les factures. Prova-ho de nou.` };
    }
    
    // 🔑 PER QUÈ: RevalidatePath força Next.js a tornar a carregar la llista de factures 
    // per reflectir els canvis al Server Component.
    revalidatePath('/finances/invoices');
    
    return { success: true, message: `S'han eliminat correctament ${ids.length} factures.` };
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
      // No tenim fàcilment l'ID de la factura, així que només revalidem la llista general.
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
 * ACCIÓ: Envia la factura per email (PDF + Edge Function).
 */
export async function sendInvoiceByEmailAction(
  invoiceId: number,
  recipientEmail: string,
  messageBody: string,
): Promise<ActionResult> {

  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await invoiceService.sendInvoiceByEmail(
    supabase,
    invoiceId,
    activeTeamId,
    recipientEmail,
    messageBody
  );

  if (result.success) {
      revalidatePath(`/finances/invoices/${invoiceId}`);
  }

  return result;
}

