// /app/[locale]/(app)/crm/quotes/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
// ❌ Eliminem Link, Plus i Button, ja que s'aniran al Client Component
// import Link from 'next/link';
// import { Plus } from 'lucide-react';
// import { Button } from '@/components/ui/button';
import { QuotesData } from './_components/QuotesData';
import { QuotesSkeleton } from './_components/QuotesSkeleton';
import type { Database } from '@/types/supabase';

export const metadata: Metadata = {
    title: 'Pressupostos | Ribot',
};

// ... Tipus de dades (no es modifiquen) ...
type Quote = Database['public']['Tables']['quotes']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

export type QuoteWithContact = Quote & {
    contacts: Pick<Contact, 'nom' | 'empresa'> | null;
};

export type QuotesSearchParams = { [key: string]: string | string[] | undefined };

interface QuotesPageProps {
    searchParams: QuotesSearchParams; 
}

/**
 * La funció del component de pàgina del servidor (Server Component)
 * que orquestra la càrrega de dades.
 */
export default async function QuotesPage({ searchParams }: QuotesPageProps) {
    
    const resolvedSearchParams: QuotesSearchParams = await Promise.resolve(searchParams); 
    const suspenseKey = JSON.stringify(resolvedSearchParams);

    return (
        <div>
            {/* ------------------------------------------------------------- */}
            {/* ❌ ELIMINEM el bloc de capçalera d'aquí. Anirà al QuotesClient.tsx */}
            {/* ------------------------------------------------------------- */}
            
            <Suspense key={suspenseKey} fallback={<QuotesSkeleton />}>
                <QuotesData searchParams={resolvedSearchParams} />
            </Suspense>
        </div>
    );
}