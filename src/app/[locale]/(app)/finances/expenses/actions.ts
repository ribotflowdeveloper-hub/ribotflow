'use server';

import { type ExpenseWithContact } from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { type Expense } from "@/types/finances/expenses";
import { revalidatePath } from "next/cache";
import { 
  type PaginatedActionParams, 
  type PaginatedResponse 
} from '@/hooks/usePaginateResource';

// ✅ 1. Importem els nous guardians, permisos i límits
import { 
  validateSessionAndPermission, 
  validateActionAndUsage 
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

import * as expensesListService from '@/lib/services/finances/expenses/expenses.service';
import * as expensesDetailService from '@/lib/services/finances/expenses/expenseDetail.service';

import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';

// Tipus
type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
type PaginatedExpensesData = PaginatedResponse<ExpenseWithContact>;
export type ExpenseForSupplier = Partial<Expense>; 

/**
 * ACCIÓ: Obté les dades paginades per al client.
 */
export async function fetchPaginatedExpenses(
  params: FetchExpensesParams,
): Promise<PaginatedExpensesData> {
  // ✅ 2. Validació de PERMÍS DE VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    console.error("Session error in fetchPaginatedExpenses:", session.error);
    return { data: [], count: 0 };
  }
  const { supabase, activeTeamId } = session;

  console.log("expenses/actions.ts (fetchPaginatedExpenses): Paràmetres rebuts:", JSON.stringify(params, null, 2));

  try {
    const result = await expensesListService.fetchPaginatedExpenses(supabase, activeTeamId, params);
    console.log(`expenses/actions.ts (fetchPaginatedExpenses): Retornant ${result.data.length} files i un count de ${result.count}`);
    return result;
  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error a fetchPaginatedExpenses (action):", message);
    return { data: [], count: 0 };
  }
}

/**
 * ACCIÓ: Processa un OCR (CREA una nova despesa).
 */
export async function processOcrAction(
  formData: FormData,
): Promise<ActionResult<Record<string, unknown>>> {
  // ✅ 3. Validació de CREACIÓ (PERMÍS + LÍMIT)
  const limitToCheck: PlanLimit = 'maxExpensesPerMonth';
  const session = await validateActionAndUsage(
    PERMISSIONS.MANAGE_EXPENSES,
    limitToCheck
  );
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  try {
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
  // ✅ 4. Validació de PERMÍS DE VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;
  
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
  // ✅ 5. Validació de PERMÍS DE VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  return await expensesDetailService.searchExpensesForLinking(supabase, activeTeamId, searchTerm);
}

/**
 * ACCIÓ: Vincula una despesa a un proveïdor.
 */
export async function linkExpenseToSupplier(
  expenseId: number,
  supplierId: string,
): Promise<ActionResult<Expense>> {
  // ✅ 6. Validació de PERMÍS DE GESTIÓ
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
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
  // ✅ 7. Validació de PERMÍS DE GESTIÓ
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
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
  // ✅ 8. Validació de PERMÍS DE VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    console.error("Session error in getUniqueExpenseCategories:", session.error);
    return [];
  }
  const { activeTeamId } = session;

  console.log("expenses/actions.ts (getUniqueExpenseCategories): Cridant al servei...");
  return await expensesListService.getUniqueExpenseCategories(activeTeamId);
}