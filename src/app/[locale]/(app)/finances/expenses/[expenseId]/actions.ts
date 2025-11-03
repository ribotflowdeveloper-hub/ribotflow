// /app/[locale]/(app)/finances/expenses/[expenseId]/actions.ts (SENSE CANVIS, JA ÉS CORRECTE)
"use server";

import { revalidatePath } from "next/cache";
import {
  type ExpenseDetail,
  type ExpenseFormDataForAction,
  type ExpenseAttachment,
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { validateUserSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/admin";

// ✅ Aquest fitxer ja importava del servei de detall correcte
import * as expensesService from "@/lib/services/finances/expenses/expenseDetail.service";

// --- Server Actions Públiques ---

/**
 * ACCIÓ: Obté el detall d'una despesa.
 */
export async function fetchExpenseDetail(expenseId: number): Promise<ExpenseDetail | null> {
  const session = await validateUserSession();
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
 */
export async function saveExpenseAction(
  expenseData: ExpenseFormDataForAction,
  expenseId: string | number | null 
): Promise<ActionResult<{ id: number }>> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

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
  const session = await validateUserSession();
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
  const session = await validateUserSession();
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
  const session = await validateUserSession();
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
  const session = await validateUserSession();
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