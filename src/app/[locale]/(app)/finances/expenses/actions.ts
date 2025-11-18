'use server';

import { 
  type ExpenseWithContact,
  type ExpenseCategory // ✅ AFEGIR
} from "@/types/finances/index"; 
import { type ActionResult } from "@/types/shared/index";
import { type Expense } from "@/types/finances/index"; 
import { revalidatePath } from "next/cache";
import { 
  type PaginatedActionParams, 
  type PaginatedResponse 
} from '@/hooks/usePaginateResource';

import { 
  validateSessionAndPermission, 
  validateActionAndUsage 
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

import * as expensesListService from '@/lib/services/finances/expenses/expenses.service';
import * as expensesDetailService from '@/lib/services/finances/expenses/expenseDetail.service';
import { getTranslations } from 'next-intl/server';
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
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    console.error("Session error in fetchPaginatedExpenses:", session.error);
    return { data: [], count: 0 };
  }
  const { supabase, activeTeamId } = session;

  try {
    const result = await expensesListService.fetchPaginatedExpenses(supabase, activeTeamId, params);
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

// ❌❌❌
// ESBORRA L'ACCIÓ ANTIGA 'getUniqueExpenseCategories'
// ❌❌❌

// ✅ AFEGIR L'ACCIÓ NOVA (la mateixa que vam fer per al detall)
/**
 * ACCIÓ: Obté el catàleg de categories de despesa per a l'equip.
 */
export async function fetchExpenseCategoriesAction(): Promise<ActionResult<ExpenseCategory[]>> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('team_id', activeTeamId)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true, data: data as ExpenseCategory[] };

  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error fetching expense categories (action):", message);
    return { success: false, message };
  }
}
/**
 * ACCIÓ: Crea una nova categoria de despesa
 */
export async function createExpenseCategoryAction(
  name: string,
  description: string | null
): Promise<ActionResult<ExpenseCategory>> {
  
  // ✅ 2. INICIALITZEM LES TRADUCCIONS
  const tShared = await getTranslations('Shared'); 
  
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES); // Hem canviat el permís a MANAGE_EXPENSES
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        team_id: activeTeamId,
        name: name,
        description: description,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Error de 'unique_constraint'
        // ✅ 3. ARA 'tShared' EXISTEIX
        throw new Error(tShared('errors.categoryExists') || 'Ja existeix una categoria amb aquest nom.');
      }
      throw error;
    }
    
    revalidatePath('/finances/expenses');
    
    return { success: true, data: data as ExpenseCategory };

  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error creating expense category (action):", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Esborra múltiples despeses (Bulk Delete).
 * @param ids Array d'IDs (number) de les despeses a eliminar.
 */
export async function deleteBulkExpensesAction(ids: number[]): Promise<ActionResult> {
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    if (ids.length === 0) {
        return { success: true, message: "No s'ha seleccionat cap despesa per eliminar." };
    }
    
    // 🔑 PER QUÈ: Eliminació optimitzada amb clàusula IN.
    const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', ids)
        .eq('team_id', activeTeamId); // Assegurança de RLS

    if (error) {
        console.error('Error al realitzar l\'eliminació massiva de despeses:', error);
        return { success: false, message: `Error al eliminar les despeses. Prova-ho de nou.` };
    }
    
    revalidatePath('/finances/expenses');
    
    return { success: true, message: `S'han eliminat correctament ${ids.length} despeses.` };
}
