// src/lib/services/finances/expenses/expenses.service.ts
import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import type { EnrichedExpense, ExpenseCategory } from "@/types/finances/expenses";
import { type PaginatedActionParams, type PaginatedResponse } from "@/hooks/usePaginateResource";

export interface ExpensePageFilters {
  category: string; 
  status: string; 
}

type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
type PaginatedExpensesData = PaginatedResponse<EnrichedExpense>;

export async function fetchPaginatedExpenses(
  supabase: SupabaseClient<Database>,
  teamId: string,
  params: FetchExpensesParams,
): Promise<PaginatedExpensesData> {
  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;

  // ✅ CORRECCIÓ: Utilitzem 'undefined' en lloc de 'null' si el tipus de Supabase ho requereix
  // (Si la definició de l'RPC és p_search_term?: string, llavors espera string | undefined)
  const p_category_id = (filters.category && filters.category !== "all" && filters.category !== "") 
    ? filters.category 
    : undefined; 
    
  const p_status = (filters.status && filters.status !== "all" && filters.status !== "") 
    ? filters.status 
    : undefined;
    
  const p_search_term = searchTerm || undefined;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_filtered_expenses",
    {
      p_team_id: teamId,
      p_search_term,
      p_category_id,
      p_status,
      p_sort_by: sortBy || "expense_date",
      p_sort_order: sortOrder || "desc",
      p_limit: limit ?? 50,
      p_offset: offset ?? 0,
    }
  );

  if (rpcError) {
    console.error("Error calling RPC get_filtered_expenses (service):", rpcError.message);
    throw new Error("Error en carregar les dades de despeses.");
  }

  if (!rpcData || rpcData.length === 0) {
    return { data: [], count: 0 };
  }

  const totalCount = rpcData[0].full_count ?? 0;

  const formattedData: EnrichedExpense[] = rpcData.map((item) => {
      return {
          ...item, 
          suppliers: item.supplier_id 
            ? { id: item.supplier_id, nom: item.supplier_nom } 
            : null,
          category_name: item.category_name,
          
          // Camps opcionals pel frontend
          expense_items: [],
          expense_attachments: []
          
      } as unknown as EnrichedExpense;
  });

  return {
    data: formattedData,
    count: totalCount,
  };
}


export async function fetchExpenseCategories(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('team_id', teamId)
    .order('name');

  if (error) {
    console.error("Error fetching categories:", error.message);
    return [];
  }
  // Cast segur al nostre tipus
  return (data || []) as unknown as ExpenseCategory[];
}