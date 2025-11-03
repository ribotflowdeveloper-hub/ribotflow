// /app/[locale]/(app)/finances/quotes/actions.ts (FITXER CORREGIT)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/actionResult";
import { type PaginatedActionParams } from "@/hooks/usePaginateResource";

// Importem les funcions del servei
import {
  getPaginatedQuotes,
  deleteQuote,
} from "@/lib/services/finances/quotes/quotes.service"; // Assegura't que la ruta al servei és correcta

// Importem els tipus centralitzats (NOMÉS PER A ÚS INTERN)
import {
  type QuotePageFilters,
  type PaginatedQuotesData,
  type QuoteId,
} from "@/types/finances/quotes";

// ❌ ELIMINEM LA LÍNIA QUE CAUSA L'ERROR
// export * from "@/types/finances/quotes";

// Definim el tipus d'entrada per a l'acció
type FetchQuotesParams = PaginatedActionParams<QuotePageFilters>;

/**
 * ACCIÓ: Obté les dades paginades.
 */
export async function fetchPaginatedQuotes(
  params: FetchQuotesParams,
): Promise<PaginatedQuotesData> {
  const session = await validateUserSession();
  if ("error" in session) return { data: [], count: 0 };
  
  const { supabase, activeTeamId } = session;

  return await getPaginatedQuotes(supabase, activeTeamId, params);
}

/**
 * ACCIÓ: Esborra un pressupost.
 */
export async function deleteQuoteAction(
  quoteId: QuoteId,
): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  if (!quoteId) {
    return { success: false, message: "ID de pressupost invàlid." };
  }

  const { error } = await deleteQuote(supabase, quoteId);

  if (error) {
    console.error("Error deleting quote (action):", error);
    return {
      success: false,
      message: `No s'ha pogut eliminar el pressupost: ${error.message}`,
    };
  }

  // ✅ CORRECCIÓ: Revalidem la ruta de finances
  revalidatePath("/finances/quotes"); 
  return { success: true, message: "Pressupost eliminat correctament." };
}