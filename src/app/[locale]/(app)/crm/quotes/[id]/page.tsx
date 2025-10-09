// /app/[locale]/(app)/crm/quotes/[id]/page.tsx

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { QuoteEditorData } from './_components/QuoteEditorData';
import { QuoteEditorSkeleton } from './_components/QuoteEditorSkeleton';

interface MetadataProps {
    params: { id: string };
}

/**
 * Funció per generar metadades dinàmiques.
 */
export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    const { id } = await params; // 👈 també cal esperar

    if (id === 'new') {
        return { title: 'Nou Pressupost | Ribot' };
    }

    const supabase = createClient();
    const { data: quote } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('id', id)
        .single();

    const title = quote ? `Editar Pressupost #${quote.quote_number}` : 'Editar Pressupost';
    return { title: `${title} | Ribot` };
}

interface PageProps {
    params: { id: string; locale: string };
}

/**
 * Funció principal de la pàgina del servidor.
 */
// ✅ CORRECCIÓ: Tornem a afegir 'async'
export default async function QuoteEditorPage({ params }: PageProps) {
    const { id, locale } = await params; // 👈 cal l’await aquí

    return (
        <Suspense fallback={<QuoteEditorSkeleton />}>
            <QuoteEditorData quoteId={id} locale={locale} />
        </Suspense>
    );
}