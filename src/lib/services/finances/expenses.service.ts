import { type ExpenseWithContact } from '@/types/finances/expenses';
import { type PostgrestError } from '@supabase/supabase-js';
import { validateUserSession } from '@/lib/supabase/session';

export interface FetchPaginatedExpensesParams {
  searchTerm?: string;
  category?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export interface PaginatedExpensesResponse {
  data: ExpenseWithContact[];
  count: number;
  error: PostgrestError | null;
}

export async function fetchPaginatedExpensesService(
  params: FetchPaginatedExpensesParams
): Promise<PaginatedExpensesResponse> {
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in fetchPaginatedExpensesService:", session.error);
    // Retornem un error estructurat
    return { data: [], count: 0, error: { message: session.error.message, details: '', hint: '', code: '401' } as PostgrestError };
  }
  const { supabase, activeTeamId } = session;

  const {
    searchTerm = '',
    category = 'all',
    status = 'all',
    sortBy = 'expense_date',
    sortOrder = 'desc',
    limit,
    offset,
  } = params;

  let query = supabase
    .from('expenses')
    .select('*, suppliers(id, nom)', { count: 'exact' })
    .eq('team_id', activeTeamId);

  if (searchTerm) {
    query = query.or(
      `description.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%,suppliers.nom.ilike.%${searchTerm}%`
    );
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (sortBy && sortOrder) {
    // Si ordenem per nom de proveïdor, hem d'utilitzar la taula relacionada
    const isSupplierSort = sortBy === 'suppliers.nom';
    query = query.order(isSupplierSort ? 'suppliers(nom)' : sortBy, {
      ascending: sortOrder === 'asc',
      foreignTable: isSupplierSort ? '' : undefined,
    });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  const typedData = data as ExpenseWithContact[] | null;

  return { data: typedData || [], count: count ?? 0, error };
}