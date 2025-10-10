import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuotesData } from './_components/QuotesData';
import { QuotesSkeleton } from './_components/QuotesSkeleton';
import type { Quote } from '@/types/crm';


export const metadata: Metadata = {
    title: 'Pressupostos | Ribot',
};

export type QuoteWithContact = Quote & {
    contacts: { nom: string; empresa: string | null; } | null;
};

// ✅ 1. Definició de tipus corregida: searchParams ÉS una Promise.
// Això compleix amb la restricció de Next.js quan s'utilitza 'await' [4, 5].
interface QuotesPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>; 
}

/**
 * La funció del component de pàgina del servidor (Server Component)
 * que orquestra la càrrega de dades.
 */
export default async function QuotesPage({ searchParams }: QuotesPageProps) {
    
    // ✅ 2. Aquest 'await' és ara semànticament correcte i satisfà el tipatge.
    const resolvedSearchParams = await searchParams; 

    // La clau de Suspense depèn de tots els paràmetres per a una recàrrega segura.
    const suspenseKey = JSON.stringify(resolvedSearchParams);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Pressupostos</h1>
                <Button asChild>
                    <Link href="/crm/quotes/new">
                        <Plus className="w-4 h-4 mr-2" /> Nou Pressupost
                    </Link>
                </Button>
            </div>
            
            {/* 
              L'ús de Suspense (importat de 'react' [6]) amb una clau dinàmica 
              permet que la UI es mantingui reactiva mentre QuotesData torna a carregar 
              les dades basant-se en els nous filtres [7, 8].
            */}
            <Suspense key={suspenseKey} fallback={<QuotesSkeleton />}>
                <QuotesData searchParams={resolvedSearchParams} />
            </Suspense>
        </div>
    );
}