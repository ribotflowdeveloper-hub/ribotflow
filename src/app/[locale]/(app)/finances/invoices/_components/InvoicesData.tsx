import { fetchPaginatedInvoices } from '../actions';
import { InvoicesClient } from './InvoiceClient';
import { type InvoiceStatus, type InvoiceFilters } from '@/types/finances/invoices';

// -------------------------------------------------------------------
// ✅ CORRECCIÓ: La interfície ara espera un sol objecte 'searchParams'
// -------------------------------------------------------------------
interface InvoicesDataProps {
  searchParams: {
    page: string;
    pageSize: string;
    search?: string;
    status?: string;
    contactId?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

/**
 * Component ASYNC que carrega les dades de les factures basant-se
 * en els paràmetres de cerca rebuts.
 */
export async function InvoicesData({ searchParams }: InvoicesDataProps) {
  // ✅ Desestructurem els paràmetres des de l'objecte 'searchParams'
  const {
    page: pageProp,
    pageSize: pageSizeProp,
    search,
    status: statusProp,
    contactId: contactIdProp,
    sortBy: sortByProp,
    sortOrder: sortOrderProp,
  } = searchParams;

  // --- El codi de validació i parseig es manté pràcticament igual ---
  const page = parseInt(pageProp, 10);
  const pageSize = parseInt(pageSizeProp, 10);
  const status = (statusProp as InvoiceStatus | undefined) ?? 'all';
  const contactId = contactIdProp ?? 'all';

  // Validació del camp per ordenar
  const allowedSortBy = ['issue_date', 'due_date', 'total_amount', 'status', 'invoice_number', 'client_name', 'contacts.nom'] as const;
  type AllowedSortBy = typeof allowedSortBy[number];
  const sortBy = (allowedSortBy.includes(sortByProp as AllowedSortBy) ? sortByProp : 'issue_date') as AllowedSortBy;
  
  const sortOrder = (sortOrderProp === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  // Construcció de l'objecte de filtres per a la consulta
  const filters: InvoiceFilters = {
    searchTerm: search || undefined,
    status: status === 'all' ? undefined : status,
    contactId: contactId === 'all' ? 'all' : parseInt(contactId, 10),
    sortBy,
    sortOrder,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  // Crida a l'acció del servidor per obtenir les dades
  const initialData = await fetchPaginatedInvoices(filters);

  // Passem les dades al component client per a la seva renderització
  return (
    <InvoicesClient initialData={initialData} />
  );
}