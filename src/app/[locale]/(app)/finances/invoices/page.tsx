import { Suspense } from 'react';
import { InvoicesData } from './_components/InvoicesData';
import { InvoicesSkeleton } from './_components/InvoicesSkeleton';
import { z } from 'zod';

// (Opcional però recomanat) Zod schema per validar i netejar els paràmetres de cerca
const searchParamsSchema = z.object({
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.string().optional(),
  contactId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

// -------------------------------------------------------------------
// ✅ CORRECCIÓ: Definim el tipus de les props amb 'searchParams' com a Promise
// -------------------------------------------------------------------
interface InvoicesPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    contactId?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

/**
 * Component de pàgina per a la llista de factures.
 */
export default async function InvoicesListPage(props: InvoicesPageProps) {
  
  // ✅ Resolem la promesa per obtenir els paràmetres de cerca
  const resolvedSearchParams = await props.searchParams;

  // ✅ (Recomanat) Validem els paràmetres amb Zod
  const validatedSearchParams = searchParamsSchema.parse(resolvedSearchParams);

  // Creem una 'key' única per a Suspense per assegurar que es refresca en canviar els filtres
  const suspenseKey = JSON.stringify(validatedSearchParams);

  return (
    <Suspense key={suspenseKey} fallback={<InvoicesSkeleton />}>
      {/* ✅ Passem l'objecte de paràmetres sencer, ja resolt i validat.
          Això és més net que passar cada propietat individualment. */}
      <InvoicesData searchParams={validatedSearchParams} />
    </Suspense>
  );
}