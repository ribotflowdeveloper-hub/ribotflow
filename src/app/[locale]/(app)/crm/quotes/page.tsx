import { Suspense } from 'react';
import type { Metadata } from 'next';
import { QuotesData } from './_components/QuotesData';
import { QuotesSkeleton } from './_components/QuotesSkeleton';
import type { Database } from '@/types/supabase';
import { z } from 'zod'; // És una bona pràctica afegir Zod per validar

// -------------------------------------------------------------------
// TIPUS DE DADES (Això es queda igual)
// -------------------------------------------------------------------
type Quote = Database['public']['Tables']['quotes']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

export type QuoteWithContact = Quote & {
    contacts: Pick<Contact, 'nom' | 'empresa'> | null;
};

// Zod schema per validar i donar valors per defecte als paràmetres de cerca
const searchParamsSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  query: z.string().optional(),
  status: z.string().optional(),
});

// -------------------------------------------------------------------
// ✅ CORRECCIÓ CLAU: La interfície de props amb 'searchParams' com a Promise
// -------------------------------------------------------------------
interface QuotesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    query?: string;
    status?: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Pressupostos | Ribot',
};

/**
 * Component de pàgina (Server Component) per a la llista de pressupostos.
 */
// -------------------------------------------------------------------
// ✅ CORRECCIÓ: El component espera 'props' i fa 'await' a 'props.searchParams'
// -------------------------------------------------------------------
export default async function QuotesPage(props: QuotesPageProps) {
  
  // 1. Resolem la promesa per obtenir els paràmetres de cerca
  const searchParams = await props.searchParams;

  // 2. (Recomanat) Validem els paràmetres amb Zod per seguretat i valors per defecte
  const parsedSearchParams = searchParamsSchema.parse(searchParams);

  // 3. Creem una key única per al Suspense per garantir que es refresca
  const suspenseKey = JSON.stringify(parsedSearchParams);

  return (
    <div>
      <Suspense key={suspenseKey} fallback={<QuotesSkeleton />}>
        {/* Passem els paràmetres ja resolts i validats al component de dades */}
        <QuotesData searchParams={parsedSearchParams} />
      </Suspense>
    </div>
  );
}