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

// La funció ha de ser 'async' per poder fer 'await' a searchParams.
export default async function QuotesPage({ searchParams }: { 
    searchParams: { [key: string]: string | string[] | undefined } 
}) {
    // Resolem la promesa dels paràmetres una sola vegada.
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
            
            <Suspense key={suspenseKey} fallback={<QuotesSkeleton />}>
                <QuotesData searchParams={resolvedSearchParams} />
            </Suspense>
        </div>
    );
}