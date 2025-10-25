"use server";

import {
  type ExpenseStatus,
  type ExpenseWithContact,
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { validateUserSession } from "@/lib/supabase/session";
import { type Expense } from "@/types/finances/expenses";
import { revalidatePath } from "next/cache";
import { unstable_cache as cache } from 'next/cache';
import { createAdminClient } from "@/lib/supabase/admin"; // <--- Ajusta la ruta i el nom si cal

import { 
  type PaginatedActionParams, 
  type PaginatedResponse 
} from '@/hooks/usePaginateResource'; // Ajusta la ruta si cal

// ✅ Pas 2: Definim el tipus Específic per als filtres d'aquesta pàgina
export interface ExpensePageFilters {
  category: string;
  status: string;
}

// ✅ Pas 3: Creem 'type aliases' per als paràmetres i la resposta
type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
// Canviem el nom per evitar conflictes amb la teva definició antiga
type PaginatedExpensesData = PaginatedResponse<ExpenseWithContact>;


// (El teu tipus RpcSearchResult es manté igual)
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
 * Obté les dades i el recompte total per a la taula de despeses.
 * ✅ ACTUALITZAT: Ara fa servir la signatura genèrica de 'usePaginatedResource'
 */
export async function fetchPaginatedExpenses(
  params: FetchExpensesParams, // <-- ✅ Signatura actualitzada
): Promise<PaginatedExpensesData> { // <-- ✅ Tipus de retorn actualitzat
  
  // ✅ Pas 4: Desestructurem els nous paràmetres
  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;

  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in fetchPaginatedExpenses:", session.error);
    return { data: [], count: 0 };
  }
  const { supabase, activeTeamId } = session;

  // --- 1. Consulta de Dades (RPC) ---
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "search_expenses",
    {
      p_team_id: activeTeamId,
      // ✅ Fem servir els paràmetres desestructurats
      p_search_term: searchTerm || null,
      p_category: filters.category && filters.category !== 'all' ? filters.category : null,
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_sort_by: sortBy || "expense_date",
      p_sort_order: sortOrder || "desc",
      p_limit: limit ?? 50,
      p_offset: offset ?? 0,
    },
  );

  if (rpcError) {
    console.error("Error calling RPC search_expenses:", rpcError.message);
    throw new Error("Error en carregar les dades de despeses.");
  }

  const formattedData = (rpcData || []).map((item: RpcSearchResult) => ({
    ...item,
    suppliers: item.supplier_id
      ? {
        id: item.supplier_id,
        nom: item.supplier_nom,
      }
      : null,
  }));

  // --- 2. Consulta de Recompte Total ---
  let countQuery = supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("team_id", activeTeamId);

  // ✅ Fem servir els paràmetres desestructurats
  if (filters.status && filters.status !== "all") {
    countQuery = countQuery.eq("status", filters.status);
  }
  if (filters.category && filters.category !== "all") {
    countQuery = countQuery.eq("category", filters.category);
  }
  if (searchTerm) { // ✅ Corregit de 'filters.searchTerm' a 'searchTerm'
    countQuery = countQuery.or(
      `description.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`,
    );
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("Error fetching expenses count:", countError.message);
    throw new Error("Error en obtenir el recompte de despeses.");
  }

  return {
    data: formattedData as unknown as ExpenseWithContact[],
    count: count ?? 0,
  };
}

/**
 * Acció per processar un OCR (ex: pujar factura per analitzar).
 */
export async function processOcrAction(
  formData: FormData,
): Promise<ActionResult<Record<string, unknown>>> {
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, message: "No s'ha proporcionat cap fitxer." };
  }

  // Això és un exemple, ajusta-ho a la teva Edge Function
  const { data, error } = await supabase.functions.invoke("process-ocr", {
    body: { file_name: file.name, file_type: file.type },
  });

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: "Document processat amb èxit.", data };
}

/**
 * Obté les despeses associades a un proveïdor específic.
 */
export async function fetchExpensesForSupplier(supplierId: string) {
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  const { data, error } = await supabase
    .from("expenses")
    .select("id, expense_date, description, total_amount, status") // Camps bàsics
    .eq("supplier_id", supplierId)
    .eq("team_id", activeTeamId)
    .order("expense_date", { ascending: false })
    .limit(50); // Limitem per rendiment

  if (error) {
    console.error("Error fetching expenses for supplier:", error.message);
    return [];
  }
  return data;
}

// Tipus per a la resposta (opcional)
export type ExpenseForSupplier = Awaited<
  ReturnType<typeof fetchExpensesForSupplier>
>[0];

/**
 * Cerca despeses que NO estan vinculades a cap proveïdor.
 */
export async function searchExpensesForLinking(
  searchTerm: string,
): Promise<
  Pick<Expense, "id" | "description" | "expense_date" | "total_amount">[]
> {
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  let query = supabase
    .from("expenses")
    .select("id, description, expense_date, total_amount")
    .eq("team_id", activeTeamId)
    .is("supplier_id", null) // ✅ Clau: Només despeses no vinculades
    .order("expense_date", { ascending: false }) // Ordenem per data recent
    .limit(10);

  if (searchTerm) {
    // Cerca per descripció o número de factura (si el tens)
    query = query.ilike("description", `%${searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error searching expenses for linking:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Vincula una despesa existent a un proveïdor.
 */
export async function linkExpenseToSupplier(
  expenseId: number, // Les IDs de despesa són números
  supplierId: string,
): Promise<ActionResult<Expense>> { // Retorna la despesa actualitzada
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  // Actualitzem la despesa
  const { data, error } = await supabase
    .from("expenses")
    .update({ supplier_id: supplierId })
    .eq("id", expenseId)
    .eq("team_id", activeTeamId) // Seguretat
    .select()
    .single();

  if (error) {
    console.error("Error linking expense:", error);
    return {
      success: false,
      message: `Error en vincular la despesa: ${error.message}`,
    };
  }

  // Revalidem les pàgines afectades
  revalidatePath(`/finances/suppliers/${supplierId}`);
  revalidatePath(`/finances/expenses/${expenseId}`);

  return {
    success: true,
    message: "Despesa vinculada.",
    data: data as Expense,
  };
}

/**
 * Desvincula una despesa d'un proveïdor.
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

  // Posem 'supplier_id' a null.
  const { error } = await supabase
    .from("expenses")
    .update({ supplier_id: null })
    .eq("id", expenseId)
    .eq("team_id", activeTeamId); // Seguretat

  if (error) {
    console.error("Error unlinking expense:", error);
    return {
      success: false,
      message: `Error en desvincular la despesa: ${error.message}`,
    };
  }

  // Revalidem les pàgines afectades
  revalidatePath(`/finances/suppliers/${supplierId}`);
  revalidatePath(`/finances/expenses/${expenseId}`);

  return { success: true, message: "Despesa desvinculada." };
}

// ======================================
// ✅ ACCIÓ PER ALS FILTRES (CORREGIDA - Client Admin dins Cache)
// ======================================

const getCachedUniqueCategories = cache(
 async (activeTeamId: string): Promise<string[]> => {
  // ✅ CORRECCIÓ: Utilitzem el client ADMIN, que no depèn de cookies
  const supabaseAdmin = createAdminClient(); // <--- Client Admin

  console.log(`[Cache Miss] Fetching categories for team ${activeTeamId} using Admin Client`);

  // La consulta utilitza el client Admin
  const { data, error } = await supabaseAdmin // <--- Utilitzem el client Admin
   .from("expenses")
   .select("category")
   .eq("team_id", activeTeamId) // <-- Molt important! Filtrem per equip manualment
   .not("category", "is", null)
   .not("category", "eq", "");

  if (error) {
   console.error(`Error fetching unique categories for team ${activeTeamId} (Admin):`, error.message);
   return [];
  }

  console.log(`[Cache Miss] Raw categories data for team ${activeTeamId} (Admin):`, data);

  const uniqueCategories = [
   ...new Set(data.map((item) => item.category).filter(Boolean)),
  ];

  console.log(`[Cache Miss] Processed unique categories for team ${activeTeamId} (Admin):`, uniqueCategories);

  return uniqueCategories.sort();
 },
 ['expense_categories_by_team'], // Clau base per la cau
 { tags: ["filters", "expenses"] } // Tags per revalidació
);

// Aquesta funció no canvia: valida sessió fora i crida la funció en cau
export async function getUniqueExpenseCategories(): Promise<string[]> {
 const session = await validateUserSession();
 if ("error" in session) {
  console.error("Session error in getUniqueExpenseCategories:", session.error);
  return [];
 }
 const { activeTeamId } = session;

 console.log(`Calling getCachedUniqueCategories for team ${activeTeamId}`);
 const categories = await getCachedUniqueCategories(activeTeamId);
 console.log(`getCachedUniqueCategories returned for team ${activeTeamId}:`, categories);

 return categories;
}