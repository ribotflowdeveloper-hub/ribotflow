// src/lib/services/finances/expenses/expenses.service.ts
import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import {

  type ExpenseWithContact,
} from "@/types/finances/index"; 
import {
  type PaginatedActionParams,
  type PaginatedResponse,
} from "@/hooks/usePaginateResource";

export interface ExpensePageFilters {
  category: string; // 'all' o un UUID
  status: string;
}

type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
type PaginatedExpensesData = PaginatedResponse<ExpenseWithContact>;

// Aquests tipus ara són autogenerats i correctes
type RpcSearchResult = Database['public']['Functions']['get_filtered_expenses']['Returns'][0];
type RpcArgs = Database['public']['Functions']['get_filtered_expenses']['Args'];

export async function fetchPaginatedExpenses(
  supabase: SupabaseClient<Database>,
  teamId: string,
  params: FetchExpensesParams,
): Promise<PaginatedExpensesData> {
  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;

  // ✅ CORRECCIÓ: Convertim "all" i "" a NULL
  const categoryFilter = (filters.category && filters.category !== "all" && filters.category !== "") 
    ? filters.category 
    : undefined;
  const statusFilter = (filters.status && filters.status !== "all" && filters.status !== "") 
    ? filters.status 
    : undefined;
  const searchFilter = searchTerm || undefined;

  // Els tipus de 'RpcArgs' ara haurien de ser 'string | null'
  const rpcParams: RpcArgs = {
    p_team_id: teamId,
    p_search_term: searchFilter,
    p_category_id: categoryFilter, 
    p_status: statusFilter,
    p_sort_by: sortBy || "expense_date",
    p_sort_order: sortOrder || "desc",
    p_limit: limit ?? 50,
    p_offset: offset ?? 0,
  };

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_filtered_expenses",
    rpcParams
  );

  if (rpcError) {
    console.error(
      "Error calling RPC get_filtered_expenses (service):",
      rpcError.message,
    );
    throw new Error("Error en carregar les dades de despeses.");
  }

  if (!rpcData || rpcData.length === 0) {
    return { data: [], count: 0 };
  }

  const totalCount = rpcData[0].full_count ?? 0;

  const formattedData = rpcData.map((item: RpcSearchResult) => ({
    ...item,
    suppliers: item.supplier_id
      ? { id: item.supplier_id, nom: item.supplier_nom }
      : null,
    // Assegurem que 'category' (text) s'omple amb el nom
    category: item.category_name, 
  }));

  return {
    data: formattedData as unknown as ExpenseWithContact[],
    count: totalCount,
  };
}

// ❌❌❌
// Assegura't que has esborrat les funcions antigues 
// 'getCachedUniqueCategories' i 'getUniqueExpenseCategories'
// d'aquest fitxer.
// ❌❌❌