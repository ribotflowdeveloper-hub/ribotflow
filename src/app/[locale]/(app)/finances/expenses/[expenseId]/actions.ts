"use server";

import { revalidatePath } from "next/cache";
import {
  type ExpenseDetail,
  type ExpenseFormDataForAction,
  type ExpenseAttachment,
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { createAdminClient } from "@/lib/supabase/admin";

// ✅ 1. Importem els nous guardians, permisos i límits
import { 
  validateSessionAndPermission, 
  validateActionAndUsage 
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

import * as expensesService from "@/lib/services/finances/expenses/expenseDetail.service";

// --- Server Actions Públiques ---

/**
 * ACCIÓ: Obté el detall d'una despesa.
 */
export async function fetchExpenseDetail(expenseId: number): Promise<ExpenseDetail | null> {
  // ✅ 2. Validació de PERMÍS DE VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return null;
  const { supabase, activeTeamId } = session;

  try {
    return await expensesService.fetchExpenseDetail(supabase, expenseId, activeTeamId);
  } catch (error) {
    console.error("Error fetching expense detail (action):", error);
    return null;
  }
}

/**
 * ACCIÓ: Desa una despesa (crea o actualitza).
 * ✅ AQUESTA ÉS LA CAPA 3 DE DEFENSA
 */
export async function saveExpenseAction(
  expenseData: ExpenseFormDataForAction,
  expenseId: string | number | null 
): Promise<ActionResult<{ id: number }>> {
  
  let validationResult;
  const isNew = expenseId === null || expenseId === 'new';

  if (isNew) {
    // ✅ 3. Validació de CREACIÓ (PERMÍS + LÍMIT)
    const limitToCheck: PlanLimit = 'maxExpensesPerMonth';
    console.log(`[saveExpenseAction] Comprovant límit: ${limitToCheck}`);
    validationResult = await validateActionAndUsage(
      PERMISSIONS.MANAGE_EXPENSES,
      limitToCheck
    );
  } else {
    // ✅ 4. Validació d'EDICIÓ (NOMÉS PERMÍS)
    validationResult = await validateSessionAndPermission(
      PERMISSIONS.MANAGE_EXPENSES
    );
  }

  if ("error" in validationResult) {
    return { success: false, message: validationResult.error.message };
  }

  const { supabase, user, activeTeamId } = validationResult;

  try {
    const { id: resultingExpenseId } = await expensesService.saveExpense(
        supabase,
        expenseData,
        expenseId,
        user.id,
        activeTeamId
    );

    revalidatePath(`/finances/expenses/${resultingExpenseId}`);
    revalidatePath("/finances/expenses"); 

    return { success: true, message: "Despesa desada.", data: { id: resultingExpenseId } };

  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error saving expense (action):", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Puja un adjunt.
 */
export async function uploadAttachmentAction(
    expenseId: string | number, 
    formData: FormData
): Promise<ActionResult<{ newAttachment: ExpenseAttachment }>> {
  // ✅ 5. Validació de PERMÍS DE GESTIÓ
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const numericExpenseId = Number(expenseId);
  if (isNaN(numericExpenseId)) {
      return { success: false, message: "ID de despesa invàlid." };
  }

  try {
    const newAttachment = await expensesService.uploadAttachment(
        supabase,
        numericExpenseId,
        formData,
        user.id,
        activeTeamId
    );

    revalidatePath(`/finances/expenses/${numericExpenseId}`);
  
    return { success: true, message: "Adjunt pujat.", data: { newAttachment } };

  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error uploading attachment (action):", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Elimina una despesa.
 */
export async function deleteExpense(expenseId: number): Promise<ActionResult> {
  // ✅ 6. Validació de PERMÍS DE GESTIÓ
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  try {
    await expensesService.deleteExpense(supabase, expenseId, activeTeamId);
    revalidatePath("/finances/expenses");
    return { success: true, message: `Despesa eliminada correctament.` };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Obté una URL signada per a un adjunt.
 */
export async function getAttachmentSignedUrl(filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
  // ✅ 7. Validació de PERMÍS DE VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { activeTeamId } = session;

  try {
    const signedUrl = await expensesService.getAttachmentSignedUrl(filePath, activeTeamId);
    return { success: true, message: "URL signada generada.", data: { signedUrl } };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Elimina un adjunt.
 */
export async function deleteAttachmentAction(
  attachmentId: string, 
  filePath: string
): Promise<ActionResult> {
  // ✅ 8. Validació de PERMÍS DE GESTIÓ
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;
  
  const supabaseAdmin = createAdminClient();

  try {
    await expensesService.deleteAttachment(
        supabase,
        supabaseAdmin,
        attachmentId,
        filePath,
        activeTeamId
    );
    return { success: true, message: "Adjunt eliminat correctament." };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}