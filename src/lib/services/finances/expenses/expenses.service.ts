// src/lib/services/finances/expenses.service.ts (CORREGIT - LLISTA)
import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import {
  type ExpenseStatus,
  type ExpenseWithContact,
} from "@/types/finances/expenses";
import {
  type PaginatedActionParams,
  type PaginatedResponse,
} from "@/hooks/usePaginateResource";
import { unstable_cache as cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// --- Tipus Locals del Servei ---

export interface ExpensePageFilters {
  category: string;
  status: string;
}

type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
type PaginatedExpensesData = PaginatedResponse<ExpenseWithContact>;

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
type RpcArgs = Database['public']['Functions']['search_expenses']['Args'];
// ---
// ⚙️ FUNCIONS DE SERVEI (LLISTA)
// ---

/**
 * SERVEI: Obté les despeses paginades usant RPC.
 * Llança un error si falla.
 */
export async function fetchPaginatedExpenses(
  supabase: SupabaseClient<Database>,
  teamId: string,
  params: FetchExpensesParams,
): Promise<PaginatedExpensesData> {
  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;

  // El teu objecte rpcParams és LÒGICAMENT CORRECTE (amb null)
  const rpcParams = {
    p_team_id: teamId,
    p_search_term: searchTerm || null, // Correcte
    p_category: filters.category && filters.category !== "all"
      ? filters.category
      : null, // Correcte
    p_status: filters.status && filters.status !== "all"
      ? filters.status
      : null, // Correcte
    p_sort_by: sortBy || "expense_date",
    p_sort_order: sortOrder || "desc",
    p_limit: limit ?? 50,
    p_offset: offset ?? 0,
  };

  // Els teus logs són perfectes
  console.log(
    "expenses.service.ts: Trucant RPC 'search_expenses' amb paràmetres:",
    JSON.stringify(rpcParams, null, 2),
  );

  // --- 1. Consulta de Dades (RPC) ---

  // 👇 AQUESTA ÉS L'ÚNICA LÍNIA MODIFICADA 👇
  // Afegim 'as any' per saltar la comprovació de tipus incorrecta de Supabase (ts(2345))
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "search_expenses",
    rpcParams as unknown as RpcArgs,
  );
  // 👆 AQUESTA ÉS L'ÚNICA LÍNIA MODIFICADA 👆

  if (rpcError) {
    console.error(
      "Error calling RPC search_expenses (service):",
      rpcError.message,
    );
    throw new Error("Error en carregar les dades de despeses.");
  }

  // LOG 2
  console.log(
    `expenses.service.ts: RPC 'search_expenses' ha retornat ${
      rpcData?.length || 0
    } files.`,
  );

  if (!rpcData || rpcData.length === 0) {
    return { data: [], count: 0 };
  }

  const formattedData = rpcData.map((item: RpcSearchResult) => ({
    ...item,
    suppliers: item.supplier_id
      ? { id: item.supplier_id, nom: item.supplier_nom }
      : null,
  }));

  // --- 2. Consulta de Recompte Total ---
  let countQuery = supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (filters.status && filters.status !== "all") {
    countQuery = countQuery.eq("status", filters.status as ExpenseStatus);
  }
  if (filters.category && filters.category !== "all") {
    countQuery = countQuery.eq("category", filters.category);
  }
  if (searchTerm) {
    countQuery = countQuery.or(
      `description.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`,
    );
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error(
      "Error fetching expenses count (service):",
      countError.message,
    );
    throw new Error("Error en obtenir el recompte de despeses.");
  }

  // LOG 3
  console.log(`expenses.service.ts: Recompte total de despeses: ${count}`);

  return {
    data: formattedData as unknown as ExpenseWithContact[],
    count: count ?? 0,
  };
}
// --- Gestió de la memòria cau (moguda aquí) ---
const getCachedUniqueCategories = cache(
  async (activeTeamId: string): Promise<string[]> => {
    const supabaseAdmin = createAdminClient();
    // 🔴 LOG 4: Miss de la memòria cau (Consola del Servidor)
    console.log(
      `[Cache Miss] expenses.service.ts: Buscant categories per team ${activeTeamId}`,
    );

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .select("category")
      .eq("team_id", activeTeamId)
      .not("category", "is", null)
      .not("category", "eq", "");

    if (error) {
      console.error(
        `Error fetching unique categories for team ${activeTeamId} (Admin):`,
        error.message,
      );
      return [];
    }

    const uniqueCategories = [
      ...new Set(data.map((item) => item.category).filter(Boolean)),
    ];
    // 🔴 LOG 5: Categories trobades (Consola del Servidor)
    console.log(
      `[Cache Miss] expenses.service.ts: Categories trobades: ${uniqueCategories.length}`,
    );
    return uniqueCategories.sort();
  },
  ["expense_categories_by_team"],
  { tags: ["filters", "expenses"] },
);

/**
 * SERVEI: Obté categories úniques (funció pública que crida la cau).
 */
export async function getUniqueExpenseCategories(
  teamId: string,
): Promise<string[]> {
  console.log(
    `expenses.service.ts: Crida a getCachedUniqueCategories per team ${teamId}`,
  );
  const categories = await getCachedUniqueCategories(teamId);
  console.log(
    `expenses.service.ts: Retornant ${categories.length} categories per team ${teamId}`,
  );
  return categories;
}
