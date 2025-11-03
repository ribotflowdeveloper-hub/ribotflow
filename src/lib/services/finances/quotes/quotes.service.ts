// src/lib/services/crm/quotes/quotes.service.ts
import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { type PaginatedActionParams } from '@/hooks/usePaginateResource';

// Importem els tipus centralitzats (assegura't que la ruta és correcta)
import {
  type QuoteWithContact,
  type RpcQuoteRow,
  type QuoteId,
  type QuotePageFilters,
  type PaginatedQuotesData,
  // Ja no necessitem 'Quote' base aquí per mapejar
} from '@/types/finances/quotes'; // O /crm/quotes

/**
 * Funció auxiliar aïllada per mapejar la fila RPC a l'objecte QuoteWithContact.
 * ✅ CORRECCIÓ (Error 3): Ara transforma RpcQuoteRow -> QuoteWithContact.
 */
function mapRpcRowToQuote(row: RpcQuoteRow): QuoteWithContact | null {
  if (!row || typeof row !== "object") {
    console.warn("Invalid row data found during mapping:", row);
    return null;
  }

  // 1. Destructurem els camps que anem a transformar o eliminar
  const { 
    contact_id, 
    contact_nom, 
    contact_empresa, 
    ...quoteBase 
  } = row;

  // 2. Creem l'objecte 'contacts' enriquit
  const contacts = contact_id
    ? {
        id: contact_id,
        nom: contact_nom ?? "",
        empresa: contact_empresa,
      }
    : null;

  // 3. Retornem l'objecte final que espera la UI (QuoteWithContact)
  // 'quoteBase' ara conté correctament 'currency', 'language', 'terms', etc.
  // perquè venen de 'RpcQuoteRow'.
  return {
    ...quoteBase, // Conté tots els camps de RpcQuoteRow excepte els destructurats
    contact_id: contact_id, // El tornem a afegir, ja que Omit no el va treure
    contacts: contacts,
  };
}

/**
 * Obté una llista paginada de pressupostos des de la funció RPC.
 */
export async function getPaginatedQuotes(
  supabase: SupabaseClient<Database>,
  teamId: string,
  params: PaginatedActionParams<QuotePageFilters>
): Promise<PaginatedQuotesData> {
  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;

  const statusParam = (filters.status === "all" || !filters.status)
    ? null
    : filters.status;
    
  const effectiveSortBy = sortBy === "client_name"
    ? "c.nom"
    : (sortBy || "issue_date");

  // ✅ CORRECCIÓ (Error 1): Canviem '|| null' per '|| undefined' 
  // per coincidir amb els tipus de la RPC de Supabase.
  const rpcParams = {
    team_id_param: teamId,
    search_term_param: searchTerm || undefined, // <-- Canviat de null a undefined
    status_param: statusParam || undefined, // <-- Canviat de null a undefined
    sort_by_param: effectiveSortBy,
    sort_order_param: sortOrder || "desc",
    limit_param: limit,
    offset_param: offset,
  };

  // console.log("Calling RPC 'search_paginated_quotes' (service) with params:", rpcParams);
  
  // (Error 2) Aquesta línia és correcta i funcional, ignorem el 'warning' de moment.
  const { data, error } = await supabase
    .rpc("search_paginated_quotes", rpcParams)
    .returns<RpcQuoteRow[]>();

  if (error) {
    console.error("Error calling search_paginated_quotes RPC (service):", {
      message: error.message,
      code: error.code,
      details: error.details,
      rpcParams,
    });
    return { data: [], count: 0 };
  }

  if (!Array.isArray(data) || data.length === 0) {
    // console.log("RPC returned no data (service).");
    return { data: [], count: 0 };
  }

  const totalCount = data[0].total_count ?? 0;
  // console.log(`RPC returned ${data.length} rows, total count: ${totalCount} (service)`);

  const mappedData = data
    .map(mapRpcRowToQuote) // ✅ Ara 'mapRpcRowToQuote' és correcta
    .filter((item): item is QuoteWithContact => item !== null);

  return {
    data: mappedData,
    count: totalCount,
  };
}

/**
 * Esborra un pressupost i els seus items associats.
 * Retorna només l'error si n'hi ha.
 */
export async function deleteQuote(
  supabase: SupabaseClient<Database>,
  quoteId: QuoteId
): Promise<{ error: PostgrestError | null }> {
  
  // 1. Eliminem items primer
  const { error: itemsError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);

  if (itemsError) {
    console.error("Error deleting quote items (service):", itemsError);
    return { error: itemsError };
  }

  // 2. Eliminem el pressupost
  const { error: quoteError } = await supabase
    .from("quotes")
    .delete()
    .eq("id", quoteId);

  if (quoteError) {
    console.error("Error deleting quote (service):", quoteError);
    return { error: quoteError };
  }

  // Èxit
  return { error: null };
}