import { redirect } from 'next/navigation';
import { InvoicesClient } from './InvoiceClient'; // Assegura't que el nom és 'InvoicesClient' o 'InvoiceClient'
import { fetchPaginatedInvoices, getClientsForFilter, type InvoicePageFilters } from '../actions';
import { createClient as createServerActionClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

// ✅ 1. Importem el comprovador d'alt nivell i el TIPUS PlanLimit
import { getUsageLimitStatus } from '@/lib/subscription/subscription';
import { type PlanLimit } from '@/config/subscriptions'; // Eliminem la importació errònia

interface InvoicesDataProps {
  page?: string;
  perPage?: string;
  sort?: string;
  status?: string;
  search?: string;
}

const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'issue_date';
const INITIAL_SORT_ORDER = 'desc';

export async function InvoicesData({}: InvoicesDataProps) {
  const supabase = createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const t = await getTranslations('InvoicesPage');

  try {
    const [initialDataResult, clientsResult, limitStatusResult] = await Promise.allSettled([
      fetchPaginatedInvoices({
        page: 1,
        searchTerm: '',
        filters: { status: 'all', contactId: 'all' } as InvoicePageFilters,
        sortBy: INITIAL_SORT_COLUMN,
        sortOrder: INITIAL_SORT_ORDER,
        limit: INITIAL_ROWS_PER_PAGE,
        offset: 0,
      }),
      getClientsForFilter(),
      // ✅ 2. Comprovem l'estat del límit amb el string literal correcte
      getUsageLimitStatus('maxInvoicesPerMonth' as PlanLimit) // <-- Corregit
    ]);

    // Gestionem errors
    if (initialDataResult.status === 'rejected') {
      console.error("Error fetching initial invoices data:", initialDataResult.reason);
      throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de factures.");
    }
    if (clientsResult.status === 'rejected') {
      console.error("Error fetching clients for filter:", clientsResult.reason);
    }
    if (limitStatusResult.status === 'rejected') {
        console.error("Error fetching usage limit status:", limitStatusResult.reason);
    }

    const initialData = initialDataResult.value;
    const clientsForFilter = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
    const invoiceLimitStatus = limitStatusResult.status === 'fulfilled' ? limitStatusResult.value : null;

    // ✅ 3. Passem les dades al client
    return (
      <InvoicesClient
        initialData={initialData}
        clientsForFilter={clientsForFilter}
        invoiceLimitStatus={invoiceLimitStatus} 
      />
    );

  } catch (error) {
    console.error("Unhandled error during InvoicesData loading:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades de la pàgina de factures.");
  }
}