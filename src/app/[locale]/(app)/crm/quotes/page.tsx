import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Importem els nostres nous components d'orquestració
import { QuotesData } from './_components/QuotesData';
import { QuotesSkeleton } from './_components/QuotesSkeleton';
import type { Quote } from '@/types/crm';

export const metadata: Metadata = {
  title: 'Pressupostos | Ribot',
};

// Mantenim el tipus aquí per a consistència, però podria anar a @/types/crm
export type QuoteWithContact = Quote & {
  contacts: {
    nom: string;
    empresa: string | null;
  } | null;
};

/**
 * @summary La pàgina principal de Pressupostos, que ara actua com a orquestradora de Suspense.
 * Aquest component es renderitza a l'instant.
 */
export default function QuotesPage() {
  return (
    <div>
      {/* La capçalera de la pàgina es renderitza a l'instant, ja que no depèn de dades asíncrones. */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pressupostos</h1>
        <Button asChild>
          <Link href="/crm/quotes/new">
            <Plus className="w-4 h-4 mr-2" />
            Nou Pressupost
          </Link>
        </Button>
      </div>
      
      {/* Suspense s'encarregarà de mostrar l'esquelet mentre les dades es carreguen. */}
      <Suspense fallback={<QuotesSkeleton />}>
        <QuotesData />
      </Suspense>
    </div>
  );
}