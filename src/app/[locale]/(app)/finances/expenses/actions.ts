"use server";

import { 
  type EnrichedExpense, 
  type ExpenseCategory 
} from "@/types/finances/expenses"; 
import type { ActionResult } from "@/types/shared/actionResult";
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
import type { PlanLimit } from "@/config/subscriptions";

import * as expensesListService from '@/lib/services/finances/expenses/expenses.service';

// Tipus
// Utilitzem directament el tipus del Hook per assegurar compatibilitat
type FetchExpensesParams = PaginatedActionParams<expensesListService.ExpensePageFilters>;
type PaginatedExpensesData = PaginatedResponse<EnrichedExpense>;

// --- LECTURA ---

export async function fetchPaginatedExpensesAction(
  params: FetchExpensesParams,
): Promise<PaginatedExpensesData> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    return { data: [], count: 0 };
  }
  
  // El hook ja ens envia 'offset', així que no cal calcular-lo des de 'page'.
  // Si el servei necessita 'searchTerm' com a string i no undefined, assegurem-ho.
  
  try {
    return await expensesListService.fetchPaginatedExpenses(
        session.supabase, 
        session.activeTeamId, 
        {
            ...params,
            // Assegurem que searchTerm no sigui undefined si el tipus ho requereix strictament
            searchTerm: params.searchTerm || "", 
        }
    );
  } catch (error) {
    console.error("Error fetching paginated expenses:", error);
    return { data: [], count: 0 };
  }
}

export async function fetchExpenseCategoriesAction(): Promise<ActionResult<ExpenseCategory[]>> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }

  try {
    const categories = await expensesListService.fetchExpenseCategories(
        session.supabase, 
        session.activeTeamId
    );
    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, message: "Error carregant categories." };
  }
}

// --- ESCRIPTURA (CATEGORIES) ---

export async function createExpenseCategoryAction(
  name: string,
  description: string | null
): Promise<ActionResult<ExpenseCategory>> {
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
    if ("error" in session) return { success: false, message: session.error.message };

    try {
        // Nota: Hauràs de moure la lògica d'insert al servei (createExpenseCategory)
        // Aquí estic posant la lògica inline com tenies, però l'ideal és moure-la.
        const { data, error } = await session.supabase
            .from('expense_categories')
            .insert({
                team_id: session.activeTeamId,
                name,
                description
            })
            .select()
            .single();

        if (error) {
             if (error.code === '23505') {
                 return { success: false, message: 'Ja existeix una categoria amb aquest nom.' };
             }
             throw error;
        }

        revalidatePath('/finances/expenses');
        return { success: true, data: data as ExpenseCategory };
    } catch (error) {
        console.error("Error creating category:", error);
        return { success: false, message: "Error creant la categoria." };
    }
}

// --- ESCRIPTURA (DESPESES) ---

export async function deleteBulkExpensesAction(ids: number[]): Promise<ActionResult> {
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
    if ("error" in session) return { success: false, message: session.error.message };

    if (ids.length === 0) {
        return { success: true, message: "No s'ha seleccionat cap despesa." };
    }
    
    try {
        // Idealment: expensesListService.deleteExpenses(ids)
        const { error } = await session.supabase
            .from('expenses')
            .delete()
            .in('id', ids)
            .eq('team_id', session.activeTeamId);

        if (error) throw error;
        
        revalidatePath('/finances/expenses');
        return { success: true, message: `S'han eliminat correctament ${ids.length} despeses.` };
    } catch (error) {
        console.error("Error deleting bulk expenses:", error);
        return { success: false, message: "Error eliminant les despeses." };
    }
}

/**
 * ACCIÓ: Processa un OCR (CREA una nova despesa).
 */
export async function processOcrAction(
): Promise<ActionResult<Record<string, unknown>>> {
  // Validació de límit del pla
  const limitToCheck: PlanLimit = 'maxExpensesPerMonth';
  const session = await validateActionAndUsage(
    PERMISSIONS.MANAGE_EXPENSES,
    limitToCheck
  );
  
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  
  try {
    // Aquesta funció hauria d'estar al servei expensesDetailService
    // const data = await expensesDetailService.processOcr(session.supabase, formData);
    // return { success: true, message: "Document processat.", data };
    
    // Placeholder fins que tinguem el servei de detall refactoritzat:
    return { success: false, message: "Funcionalitat OCR pendent de refactorització." };

  } catch (error: unknown) {
    return { success: false, message: (error as Error).message };
  }
}

// --- VINCULACIÓ PROVEÏDORS ---

export async function linkExpenseToSupplierAction(
  expenseId: number,
  supplierId: string,
): Promise<ActionResult<EnrichedExpense>> {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };

  try {
    // Idealment: expensesService.linkSupplier(expenseId, supplierId)
    const { data, error } = await session.supabase
        .from('expenses')
        .update({ supplier_id: supplierId })
        .eq('id', expenseId)
        .eq('team_id', session.activeTeamId)
        .select()
        .single();

    if (error) throw error;

    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/finances/expenses/${expenseId}`);
    
    return { success: true, message: "Despesa vinculada.", data: data as unknown as EnrichedExpense };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function unlinkExpenseFromSupplierAction(
  expenseId: number,
  supplierId: string, 
): Promise<ActionResult> {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };

  try {
     const { error } = await session.supabase
        .from('expenses')
        .update({ supplier_id: null })
        .eq('id', expenseId)
        .eq('team_id', session.activeTeamId);

     if (error) throw error;

    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/finances/expenses/${expenseId}`);
    return { success: true, message: "Despesa desvinculada." };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}