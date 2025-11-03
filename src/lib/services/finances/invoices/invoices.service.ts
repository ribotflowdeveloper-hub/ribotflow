// src/lib/services/finances/invoices/invoices.service.ts (FITXER CORREGIT)
import { createAdminClient } from "@/lib/supabase/admin";
import { type SupabaseClient } from '@supabase/supabase-js';
import { type InvoiceListRow } from '@/types/finances/invoices';
import { type InvoiceStatus } from '@/types/db'; // ✅ Importem el tipus ENUM des de db.ts
import { unstable_cache as cache } from 'next/cache';

// ✅ CORRECCIÓ: Definim i EXPORTEM el tipus RPC aquí.
// Aquest tipus pertany a la capa de dades/servei.
export interface RpcInvoiceRow {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: InvoiceStatus;
  client_name: string;
  contact_id: number | null;
  contact_nom: string | null;
  total_count: number;
}

// ✅ CORRECCIÓ: Els paràmetres del servei ara són primitius o tipus de DB.
// Ja no depèn de 'InvoicePageFilters' de l'acció.
interface GetPaginatedInvoicesParams {
  teamId: string;
  supabase: SupabaseClient;
  searchTerm: string | null;
  statusParam: InvoiceStatus | null; // <-- Paràmetre simple
  contactIdParam: number | null;     // <-- Paràmetre simple
  sortBy: string;
  sortOrder: string;
  limit: number;
  offset: number;
}

/**
 * SERVEI: Obté factures paginades des de la base de dades (RPC).
 */
export async function getPaginatedInvoices(params: GetPaginatedInvoicesParams) {
  const {
    teamId,
    supabase,
    searchTerm,
    statusParam, // ✅ Utilitzem el paràmetre simple
    contactIdParam, // ✅ Utilitzem el paràmetre simple
    sortBy,
    sortOrder,
    limit,
    offset,
  } = params;

  const rpcParams = {
    team_id_param: teamId,
    search_term_param: searchTerm || null,
    status_param: statusParam,
    contact_id_param: contactIdParam,
    sort_by_param: sortBy,
    sort_order_param: sortOrder,
    limit_param: limit,
    offset_param: offset,
  };

  // ✅ CORRECCIÓ: Ja no cal importar RpcInvoiceRow, està definit localment.
  const { data, error } = await supabase
    .rpc('search_paginated_invoices', rpcParams)
    .returns<RpcInvoiceRow[]>();

  if (error) {
    console.error("Error in getPaginatedInvoices service:", error, "Params:", rpcParams);
    throw new Error("Error en carregar les factures des del servei.");
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
    count: totalCount,
  };
}

// --- Servei per als Filtres (Aquest ja estava bé) ---

const getCachedClientsForFilter = cache(
  async (activeTeamId: string): Promise<{ id: number; nom: string | null }[]> => {
    const supabaseAdmin = createAdminClient(); 
    console.log(`[Cache Miss] Fetching clients for filter, team ${activeTeamId}`);
    
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('id, nom')
      .eq('team_id', activeTeamId)
      //
      // ✅✅✅ LÍNIA CORREGIDA ✅✅✅
      //
      // .is('is_client', true) // <--- LÍNIA INCORRECTA
      .eq('estat', 'Client')  // <--- LÍNIA CORRECTA
      //
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

export async function getClientsForFilterService(teamId: string): Promise<{ id: number; nom: string | null }[]> {
    return getCachedClientsForFilter(teamId);
}