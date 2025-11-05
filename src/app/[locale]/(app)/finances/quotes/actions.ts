// /app/[locale]/(app)/finances/quotes/actions.ts (FITXER COMPLET I REFORÇAT)
"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult } from "@/types/shared/actionResult";
import { type PaginatedActionParams } from "@/hooks/usePaginateResource";
import {
  PERMISSIONS,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";
// Importem les funcions del servei
import {
  getPaginatedQuotes,
  deleteQuote,
} from "@/lib/services/finances/quotes/quotes.service"; 

// Importem els tipus centralitzats
import {
  type QuotePageFilters,
  type PaginatedQuotesData,
  type QuoteId,
} from "@/types/finances/quotes";

type FetchQuotesParams = PaginatedActionParams<QuotePageFilters>;

/**
 * ACCIÓ: Obté les dades paginades.
 */
export async function fetchPaginatedQuotes(
  params: FetchQuotesParams,
): Promise<PaginatedQuotesData> {
  // ✅ SEGURETAT (RBAC): L'usuari té permís per VEURE les finances?
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
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
  // ✅ SEGURETAT (RBAC): L'usuari té permís per GESTIONAR pressupostos?
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_QUOTES);
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

  revalidatePath("/finances/quotes"); 
  return { success: true, message: "Pressupost eliminat correctament." };
}