// src/app/[locale]/(app)/finances/invoices/_components/InvoicesData.tsx
import { fetchPaginatedInvoices } from '../actions';
import { InvoicesClient } from './InvoiceClient';
import { type InvoiceStatus, type InvoiceFilters } from '@/types/finances/invoices';

// ✅ Rep props primitives
interface InvoicesDataProps {
  page: string;
  pageSize: string;
  search?: string;
  status?: string;
  contactId?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ✅ Component ASYNC que rep props primitives
export async function InvoicesData({
  page: pageProp,
  pageSize: pageSizeProp,
  search,
  status: statusProp,
  contactId: contactIdProp,
  sortBy: sortByProp,
  sortOrder: sortOrderProp,
}: InvoicesDataProps) {

  // Parseja i valida props
  const page = parseInt(pageProp, 10);
  const pageSize = parseInt(pageSizeProp, 10);
  // ✅ Cast directe a InvoiceStatus (assumint que ve correcte de l'URL) o 'all'
  const status = (statusProp as InvoiceStatus | undefined) ?? 'all';
  const contactId = contactIdProp ?? 'all';
  const allowedSortBy = ['issue_date', 'due_date', 'total_amount', 'status', 'invoice_number', 'client_name', 'contacts.nom'] as const;
  type AllowedSortBy = typeof allowedSortBy[number];
  const sortBy = (allowedSortBy.includes(sortByProp as AllowedSortBy) ? sortByProp : 'issue_date') as AllowedSortBy;
  const sortOrder = (sortOrderProp === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  // Construeix filtres
  const filters: InvoiceFilters = {
    searchTerm: search || undefined,
    status: status === 'all' ? undefined : status, // Passa undefined si és 'all'
    contactId: contactId === 'all' ? 'all' : parseInt(contactId, 10), // Passa 'all' o número
    sortBy,
    sortOrder,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  // Crida l'acció
  const initialData = await fetchPaginatedInvoices(filters);

  // Passa dades al client
  return (
    <InvoicesClient initialData={initialData} />
  );
}