// src/app/[locale]/(app)/finances/invoices/actions.ts
"use server";

import { validateUserSession } from "@/lib/supabase/session";
import {
  type InvoiceListRow,
  type InvoiceStatus
  // ❗ Eliminem l'import no utilitzat: type InvoiceFilters as OriginalInvoiceFilters
} from '@/types/finances/invoices';
import {
  type PaginatedActionParams,
  type PaginatedResponse
} from '@/hooks/usePaginateResource'; // ✅ Importació corregida
import { unstable_cache as cache } from 'next/cache';
import { createAdminClient } from "@/lib/supabase/admin";

// --- Tipus Específics per a la Pàgina de Factures ---

// Filtres específics per a la pàgina de factures (TFilters)
export interface InvoicePageFilters {
  status: InvoiceStatus | 'all';
  contactId: string | 'all'; // Canviat a string per coherència amb el Select
}

// Alias per als paràmetres i la resposta del hook genèric
type FetchInvoicesParams = PaginatedActionParams<InvoicePageFilters>;
type PaginatedInvoicesData = PaginatedResponse<InvoiceListRow>;

// Tipus per a la resposta RPC (manté el teu)
// ✅ Definició de tipus per a la resposta de la funció RPC
// Això reflecteix exactament el 'RETURNS TABLE' de la nostra funció SQL.
interface RpcInvoiceRow {
  id: number;
  invoice_number: string; // o text
  issue_date: string; // o date
  due_date: string | null; // o date
  total_amount: number; // o numeric
  status: InvoiceStatus; // o public.invoice_status
  client_name: string; // o text
  contact_id: number | null;
  contact_nom: string | null; // Columna del JOIN
  total_count: number; // o bigint
}
// --- Acció Principal per Obtenir Dades Paginades ---

/**
 * Obté factures paginades usant RPC, adaptat per a usePaginatedResource.
 */
export async function fetchPaginatedInvoices(
  params: FetchInvoicesParams // <-- Paràmetre genèric
): Promise<PaginatedInvoicesData> {

  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params; // Desestructurem

  const session = await validateUserSession();
  if ("error" in session) return { data: [], count: 0 };
  const { supabase, activeTeamId } = session;

  // Adaptem els filtres específics
  const statusParam = (filters.status === 'all' || !filters.status) ? null : filters.status;
  // Convertim contactId a número o 0 si és 'all' (segons la teva lògica RPC)
  const contactIdParam = (filters.contactId === 'all' || !filters.contactId) ? 0 : Number(filters.contactId);

  const rpcParams = {
    team_id_param: activeTeamId,
    search_term_param: searchTerm || null,
    status_param: statusParam,
    contact_id_param: contactIdParam,
    sort_by_param: sortBy || 'issue_date', // Valor per defecte
    sort_order_param: sortOrder || 'desc',   // Valor per defecte
    limit_param: limit, // Ja ve del hook
    offset_param: offset, // Ja ve del hook
  };

  const { data, error } = await supabase
    .rpc('search_paginated_invoices', rpcParams)
    .returns<RpcInvoiceRow[]>();

  if (error) {
    console.error("Error calling search_paginated_invoices RPC:", error, "Params:", rpcParams);
    // Podries llançar l'error perquè el hook el gestioni si vols
    // throw new Error("Error en carregar les factures.");
    return { data: [], count: 0 }; // O retornar buit
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { data: [], count: 0 };
  }

  const totalCount = data[0].total_count ?? 0;

  const mappedData: InvoiceListRow[] = data.map((row): InvoiceListRow => ({
    id: row.id,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    total_amount: row.total_amount,
    status: row.status,
    client_name: row.client_name,
    contact_id: row.contact_id,
    contacts: row.contact_id ? { nom: row.contact_nom || null } : null,
  }));

  return {
    data: mappedData,
    count: totalCount
  };
}


// --- Acció per Esborrar (necessària per al hook) ---
// Mou o assegura't que existeix deleteInvoiceAction
// Normalment estaria a [invoiceId]/actions.ts
// Aquí un exemple si no la tens:
/*
export async function deleteInvoiceAction(invoiceId: number): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('team_id', activeTeamId); // Important per seguretat

    if (error) {
        console.error("Error deleting invoice:", error);
        return { success: false, message: "Error en eliminar la factura." };
    }

    revalidatePath('/finances/invoices'); // Revalida la llista
    return { success: true, message: "Factura eliminada correctament." };
}
*/
// Assegura't d'importar-la correctament al InvoicesClient des d'on estigui

// --- (Opcional) Acció per obtenir opcions de filtre (Ex: Clients) ---

const getCachedClientsForFilter = cache(
  async (activeTeamId: string): Promise<{ id: number; nom: string | null }[]> => {
    const supabaseAdmin = createAdminClient();
    console.log(`[Cache Miss] Fetching clients for filter, team ${activeTeamId}`);
    const { data, error } = await supabaseAdmin
      .from('contacts') // O la taula correcta de clients
      .select('id, nom')
      .eq('team_id', activeTeamId)
      .is('is_client', true) // O la condició que defineixi un client
      .order('nom', { ascending: true });

    if (error) {
      console.error(`Error fetching clients for filter (Admin):`, error.message);
      return [];
    }
    console.log(`[Cache Miss] Fetched ${data.length} clients for filter (Admin)`);
    return data || [];
  },
  ['clients_for_invoice_filter'],
  { tags: ["filters", "contacts"] }
);

export async function getClientsForFilter(): Promise<{ id: number; nom: string | null }[]> {
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in getClientsForFilter:", session.error);
    return [];
  }
  return getCachedClientsForFilter(session.activeTeamId);
}