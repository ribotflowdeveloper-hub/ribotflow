"use server";

import { validateUserSession } from "@/lib/supabase/session";
import {
  type PaginatedInvoicesResponse,
  type InvoiceFilters,
  type InvoiceListRow,
  type InvoiceStatus,
} from '@/types/finances/invoices';

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

/**
 * Obté factures paginades usant una funció RPC de Supabase per a cerca avançada.
 */
export async function fetchPaginatedInvoices(
  filters: InvoiceFilters
): Promise<PaginatedInvoicesResponse> {
  const session = await validateUserSession();
  if ("error" in session) return { data: [], count: 0 };
  const { supabase, activeTeamId } = session;

  const {
    searchTerm, status, contactId,
    sortBy = 'issue_date', sortOrder = 'desc',
    limit = 10, offset = 0
  } = filters;

  const params = {
    team_id_param: activeTeamId,
    search_term_param: searchTerm || null,
    status_param: (status === 'all' || !status) ? null : status,
    contact_id_param: (contactId === 'all' || !contactId) ? 0 : Number(contactId),
    sort_by_param: sortBy,
    sort_order_param: sortOrder,
    limit_param: limit,
    offset_param: offset,
  };

  // Crida a la funció RPC
  // ✅ CORRECCIÓ: Tipem la resposta esperada de .rpc()
  const { data, error } = await supabase
    .rpc('search_paginated_invoices', params)
    .returns<RpcInvoiceRow[]>(); // 👈 Especifiquem el tipus de retorn

  if (error) {
    console.error(
      "Error calling search_paginated_invoices RPC:", 
      error, 
      "Amb paràmetres:", 
      params
    );
    return { data: [], count: 0 };
  }

  // ✅ 'data' ara és 'RpcInvoiceRow[] | null | { Error: ... }'
  if (!Array.isArray(data) || data.length === 0) {
    return { data: [], count: 0 };
  }

  // El recompte total ve a cada fila, l'agafem de la primera
  const totalCount = data[0].total_count ?? 0;

  // ✅ CORRECCIÓ: Eliminem 'any'. 'row' ara és del tipus 'RpcInvoiceRow'
  const mappedData: InvoiceListRow[] = data.map((row: RpcInvoiceRow): InvoiceListRow => {
    return {
      id: row.id,
      invoice_number: row.invoice_number,
      issue_date: row.issue_date,
      due_date: row.due_date,
      total_amount: row.total_amount,
      status: row.status, // El tipus ja coincideix
      client_name: row.client_name,
      contact_id: row.contact_id,
      contacts: row.contact_id ? { nom: row.contact_nom || null } : null,
    };
  });

  return {
    data: mappedData,
    count: totalCount
  };
}