// src/app/[locale]/(app)/finances/invoices/_components/InvoicesData.tsx
import { redirect } from 'next/navigation'; // Per si cal redirigir
import { InvoicesClient } from './InvoiceClient'; // El client refactoritzat
import { fetchPaginatedInvoices, getClientsForFilter, type InvoicePageFilters } from '../actions'; // Accions actualitzades
import { createClient as createServerActionClient } from '@/lib/supabase/server'; // Per validar sessió
import { getTranslations } from 'next-intl/server'; // Per traduccions d'error

// ✅ CORRECCIÓ: Les props ara són els paràmetres individuals
interface InvoicesDataProps {
  page?: string;
  perPage?: string;
  sort?: string;
  status?: string;
  search?: string;
}
// Opcions inicials (han de coincidir amb el hook)
const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'issue_date';
const INITIAL_SORT_ORDER = 'desc';
/**
 * Component ASYNC que carrega les dades inicials per a InvoicesClient.
 */
export async function InvoicesData({}: InvoicesDataProps) { // Ja no necessitem searchParams directament
  const supabase = createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login'); // O la teva pàgina de login
  }

  const t = await getTranslations('InvoicesPage'); // Per missatges d'error

  try {
    // Obtenim dades inicials i clients en paral·lel
    const [initialDataResult, clientsResult] = await Promise.allSettled([
      fetchPaginatedInvoices({
        searchTerm: '', // O llegir de searchParams si ho prefereixes
        filters: { status: 'all', contactId: 'all' } as InvoicePageFilters,
        sortBy: INITIAL_SORT_COLUMN,
        sortOrder: INITIAL_SORT_ORDER,
        limit: INITIAL_ROWS_PER_PAGE,
        offset: 0,
      }),
      getClientsForFilter() // Obtenim els clients per al filtre
    ]);

    // Gestionem errors
    if (initialDataResult.status === 'rejected') {
      console.error("Error fetching initial invoices data:", initialDataResult.reason);
      throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de factures.");
    }
    if (clientsResult.status === 'rejected') {
      console.error("Error fetching clients for filter:", clientsResult.reason);
      // Podem continuar sense el filtre de clients
    }

    const initialData = initialDataResult.value;
    const clientsForFilter = clientsResult.status === 'fulfilled' ? clientsResult.value : [];

    // Passem les dades i opcions de filtre al client
    return (
      <InvoicesClient
        initialData={initialData}
        clientsForFilter={clientsForFilter}
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