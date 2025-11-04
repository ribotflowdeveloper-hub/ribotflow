// /app/[locale]/(app)/finances/expenses/actions.ts (FITXER CORREGIT)
'use server';

import {
  type ExpenseWithContact,
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { validateUserSession } from "@/lib/supabase/session";
import { type Expense } from "@/types/finances/expenses";
import { revalidatePath } from "next/cache";
import { 
  type PaginatedActionParams, 
  type PaginatedResponse 
} from '@/hooks/usePaginateResource';

// ✅ 1. Importem ELS DOS NOUS SERVEIS
import * as expensesListService from '@/lib/services/finances/expenses/expenses.service';
import * as expensesDetailService from '@/lib/services/finances/expenses/expenseDetail.service';

// ✅ 2. Importem el tipus NOMÉS PER A ÚS INTERN
import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';

// Definim els tipus que el client necessita
type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
type PaginatedExpensesData = PaginatedResponse<ExpenseWithContact>;
export type ExpenseForSupplier = Partial<Expense>; // Aquest export de tipus local és correcte

/**
 * ACCIÓ: Obté les dades paginades per al client.
 */
export async function fetchPaginatedExpenses(
  params: FetchExpensesParams,
): Promise<PaginatedExpensesData> {
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in fetchPaginatedExpenses:", session.error);
    return { data: [], count: 0 };
  }
  const { supabase, activeTeamId } = session;

  // 🔴 LOG 6: Paràmetres rebuts per l'ACCIÓ (Consola del Servidor)
  console.log("expenses/actions.ts (fetchPaginatedExpenses): Paràmetres rebuts:", JSON.stringify(params, null, 2));

  try {
    // ✅ Crida al servei de LLISTA
    const result = await expensesListService.fetchPaginatedExpenses(supabase, activeTeamId, params);
    
    // 🔴 LOG 7: Resultat del SERVEI (Consola del Servidor)
    console.log(`expenses/actions.ts (fetchPaginatedExpenses): Retornant ${result.data.length} files i un count de ${result.count}`);
    return result;

  } catch (error: unknown) {
    // ✅ CORRECCIÓ: Propaguem l'error a la UI
    const message = (error as Error).message;
    console.error("Error a fetchPaginatedExpenses (action):", message);
    return { data: [], count: 0 };
  }
}

/**
 * ACCIÓ: Processa un OCR.
 */
export async function processOcrAction(
  formData: FormData,
): Promise<ActionResult<Record<string, unknown>>> {
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  try {
    // ✅ Crida al servei de DETALL
    const data = await expensesDetailService.processOcr(supabase, formData);
    return { success: true, message: "Document processat amb èxit.", data };
  } catch (error: unknown) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * ACCIÓ: Obté despeses per a un proveïdor.
 */
export async function fetchExpensesForSupplier(supplierId: string) {
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;
  
  // ✅ Crida al servei de DETALL
  return await expensesDetailService.fetchExpensesForSupplier(supabase, supplierId, activeTeamId);
}

/**
 * ACCIÓ: Cerca despeses no vinculades.
 */
export async function searchExpensesForLinking(
  searchTerm: string,
): Promise<
  Pick<Expense, "id" | "description" | "expense_date" | "total_amount">[]
> {
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  // ✅ Crida al servei de DETALL
  return await expensesDetailService.searchExpensesForLinking(supabase, activeTeamId, searchTerm);
}

/**
 * ACCIÓ: Vincula una despesa a un proveïdor.
 */
export async function linkExpenseToSupplier(
  expenseId: number,
  supplierId: string,
): Promise<ActionResult<Expense>> {
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
    // ✅ Crida al servei de DETALL
    const data = await expensesDetailService.linkExpenseToSupplier(supabase, activeTeamId, expenseId, supplierId);
    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/finances/expenses/${expenseId}`);
    return { success: true, message: "Despesa vinculada.", data };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Desvincula una despesa d'un proveïdor.
 */
export async function unlinkExpenseFromSupplier(
  expenseId: number,
  supplierId: string, // Per revalidar
): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
    // ✅ Crida al servei de DETALL
    await expensesDetailService.unlinkExpenseFromSupplier(supabase, activeTeamId, expenseId);
    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/finances/expenses/${expenseId}`);
    return { success: true, message: "Despesa desvinculada." };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Obté categories úniques (gestiona la sessió).
 */
export async function getUniqueExpenseCategories(): Promise<string[]> {
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in getUniqueExpenseCategories:", session.error);
    return [];
  }
  const { activeTeamId } = session;

  console.log("expenses/actions.ts (getUniqueExpenseCategories): Cridant al servei...");
  // ✅ Crida al servei de LLISTA
  return await expensesListService.getUniqueExpenseCategories(activeTeamId);
}