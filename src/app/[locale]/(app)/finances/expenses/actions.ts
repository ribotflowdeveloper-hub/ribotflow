// src/app/[locale]/(app)/finances/despeses/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import {
    type Expense,
    type ExpenseItem,
    type ExpenseWithContact,
    type ExpenseDetail,
    type ExpenseFormDataForAction,
    type ExpenseStatus 
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { validateUserSession } from "@/lib/supabase/session";
import { createClient as createServerActionClient } from "@/lib/supabase/server";
import { type SupabaseClient, type User } from "@supabase/supabase-js";

export interface ExpenseFilters {
    searchTerm?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string; 
    limit?: number; 
    offset?: number; 
}

// ✅ NOU: Tipus de resposta per a la paginació
export interface PaginatedExpensesResponse {
    data: ExpenseWithContact[];
    count: number;
}

type RpcSearchResult = {
    id: number;
    invoice_number: string | null;
    expense_date: string;
    total_amount: number;
    category: string | null;
    description: string;
    supplier_id: string | null;
    supplier_nom: string | null;
    status: ExpenseStatus;
    payment_date: string | null;
    is_billable: boolean;
    project_id: string | null;
};

/**
 * ✅ NOU: Funció principal per a la paginació.
 * Obté les dades i el recompte total.
 */
export async function fetchPaginatedExpenses(filters: ExpenseFilters): Promise<PaginatedExpensesResponse> {
    const session = await validateUserSession();
    if ("error" in session) {
        console.error("Session error in fetchPaginatedExpenses:", session.error);
        return { data: [], count: 0 };
    }
    const { supabase, activeTeamId } = session;

    // --- 1. Consulta de Dades (RPC, com abans) ---
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_expenses', {
        p_team_id: activeTeamId,
        p_search_term: filters.searchTerm || null,
        p_category: filters.category || null,
        p_status: filters.status || null, 
        p_sort_by: filters.sortBy || 'expense_date',
        p_sort_order: filters.sortOrder || 'desc',
        p_limit: filters.limit ?? 50,
        p_offset: filters.offset ?? 0,
    });

    if (rpcError) {
        console.error("Error calling RPC search_expenses:", rpcError.message);
        throw new Error("Error en carregar les dades de despeses.");
    }

    const formattedData = (rpcData || []).map((item: RpcSearchResult) => ({
        ...item,
        suppliers: item.supplier_id ? {
            id: item.supplier_id,
            nom: item.supplier_nom,
        } : null,
    }));

    // --- 2. Consulta de Recompte Total ---
    // El Per Què: Necessitem una segona consulta que utilitzi ELS MATEIXOS FILTRES
    // que l'RPC, però sense límit ni offset, per saber el total de registres.
    
    let countQuery = supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', activeTeamId);

    // Apliquem els mateixos filtres que l'RPC
    if (filters.status && filters.status !== 'all') {
        countQuery = countQuery.eq('status', filters.status);
    }
    if (filters.category && filters.category !== 'all') {
        countQuery = countQuery.eq('category', filters.category);
    }
    if (filters.searchTerm) {
        // Assumim que l'RPC busca en 'description' i 'invoice_number'
        // Ajusta-ho si l'RPC busca en més camps.
        countQuery = countQuery.or(
            `description.ilike.%${filters.searchTerm}%,invoice_number.ilike.%${filters.searchTerm}%`
        );
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
        console.error("Error fetching expenses count:", countError.message);
        throw new Error("Error en obtenir el recompte de despeses.");
    }

    return { 
        data: formattedData as unknown as ExpenseWithContact[], 
        count: count ?? 0 
    };
}


// (Mantenim les altres funcions d'abans, com fetchExpenseDetail, per no trencar res)

export async function fetchExpenseDetail(expenseId: number): Promise<ExpenseDetail | null> {
    const supabase = createServerActionClient();

    const { data, error } = await supabase
        .from('expenses')
        .select(`
            *,
            suppliers (id, nom, nif),
            expense_items (*),
            expense_attachments (*)
        `)
        .eq('id', expenseId)
        .single();

    if (error) {
        console.error("Error fetching expense detail:", error.message);
        return null;
    }

    return data as unknown as ExpenseDetail;
}

// --- Helpers Interns (La resta del fitxer no canvia) ---

async function upsertExpenseDetails(
  supabase: SupabaseClient,
  expenseData: Omit<Expense, "id" | "created_at" | "user_id" | "team_id">,
  expenseId: string | number | null,
  userId: string,
  teamId: string
): Promise<ActionResult<Expense>> {
  if (expenseData.expense_date) {
    try {
      expenseData.expense_date = new Date(expenseData.expense_date).toISOString().split('T')[0];
    } catch (e) {
      console.error("Error al formatar la data:", e);
      return { success: false, message: "Format de data invàlid." };
    }
  }

  const query = expenseId
    ? supabase.from("expenses").update(expenseData).eq("id", expenseId)
    : supabase.from("expenses").insert({ ...expenseData, user_id: userId, team_id: teamId });

  const { data, error } = await query.select().single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Despesa desada correctament.", data: data as Expense };
}

async function syncExpenseItems(
  supabase: SupabaseClient,
  expenseId: number,
  items: ExpenseItem[] | undefined,
  user: User,
  teamId: string
): Promise<ActionResult> {
  if (!items || items.length === 0) {
    const { error: deleteError } = await supabase.from('expense_items').delete().eq('expense_id', expenseId);
    if (deleteError) {
      return { success: false, message: `Error netejant conceptes antics: ${deleteError.message}` };
    }
    return { success: true, message: "No hi ha conceptes per sincronitzar." };
  }

  const existingItemIds = items.map(item => item.id).filter(id => id && id > 0);

  const { error: deleteError } = await supabase
    .from('expense_items')
    .delete()
    .eq('expense_id', expenseId)
    .not('id', 'in', `(${existingItemIds.join(',')})`);

  if (deleteError) {
    return { success: false, message: `Error esborrant conceptes: ${deleteError.message}` };
  }

  const itemsToUpsert = items.map(item => ({
    ...item,
    expense_id: expenseId,
    user_id: user.id,
    team_id: teamId,
  }));

  const { error: upsertError } = await supabase
    .from("expense_items")
    .upsert(itemsToUpsert, { onConflict: 'id', ignoreDuplicates: false });

  if (upsertError) {
    return { success: false, message: `Error actualitzant conceptes: ${upsertError.message}` };
  }

  return { success: true, message: "Conceptes sincronitzats correctament." };
}


// --- Server Actions Públiques (La resta del fitxer no canvia) ---

export async function processOcrAction(formData: FormData): Promise<ActionResult<Record<string, unknown>>> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase } = session;

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." };

  const { data, error } = await supabase.functions.invoke("process-ocr", { body: { file_name: file.name, file_type: file.type } });

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: "Document processat amb èxit.", data };
}

export async function saveExpenseAction(
  expenseData: ExpenseFormDataForAction,
  expenseId: string | number | null
): Promise<ActionResult<Expense>> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const { expense_items, id: formId, ...rest } = expenseData;
  const currentId: string | number | null = expenseId ?? formId ?? null;

  const expenseResult = await upsertExpenseDetails(supabase, rest, currentId, user.id, activeTeamId);
  if (!expenseResult.success || !expenseResult.data) {
    return expenseResult;
  }

  const newExpenseId = expenseResult.data.id as number;
  const itemsResult = await syncExpenseItems(supabase, newExpenseId, expense_items, user, activeTeamId);
  if (!itemsResult.success) {
    return { success: false, message: itemsResult.message, data: expenseResult.data };
  }

  revalidatePath("/finances/despeses");
  if (newExpenseId) {
    revalidatePath(`/finances/despeses/${newExpenseId}`);
  }

  return { success: true, message: "Despesa desada amb èxit.", data: expenseResult.data };
}

export async function uploadAttachmentAction(expenseId: string, formData: FormData): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." };

  const filePath = `${activeTeamId}/${expenseId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("despeses-adjunts").upload(filePath, file);
  if (uploadError) return { success: false, message: uploadError.message };

  const { error: dbError } = await supabase.from("expense_attachments").insert({
    expense_id: expenseId as unknown as number,
    user_id: user.id,
    team_id: activeTeamId,
    file_path: filePath,
    filename: file.name,
    mime_type: file.type,
  });
  if (dbError) return { success: false, message: dbError.message };

  revalidatePath("/finances/despeses");
  revalidatePath(`/finances/despeses/${expenseId}`);
  return { success: true, message: "Adjunt pujat correctament." };
}

export async function deleteExpense(expenseId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase } = session;

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    console.error("Error deleting expense:", error.message);
    return { success: false, message: `Error al eliminar la despesa: ${error.message}` };
  }

  revalidatePath("/finances/despeses");
  return { success: true, message: `Despesa eliminada correctament.` };
}