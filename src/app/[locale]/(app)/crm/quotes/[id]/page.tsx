// src/app/[locale]/(app)/crm/quotes/[id]/page.tsx

import { Suspense } from 'react';
import { type Metadata } from 'next';
import { QuoteEditorData } from './_components/QuoteEditorData';
import { QuoteEditorSkeleton } from './_components/QuoteEditorSkeleton';

interface QuoteEditorPageProps {
    params: { id: string; locale: string };
}

// -------------------------------------------------------------------
// ✅ CORRECCIÓ generateMetadata: Resolem params abans d'accedir a .id
// -------------------------------------------------------------------
export async function generateMetadata({ params }: QuoteEditorPageProps): Promise<Metadata> {
    // Ús del patró segur d'await Promise.resolve per evitar l'error 'sync-dynamic-apis'.
    const resolvedParams = await Promise.resolve(params);
    
    if (resolvedParams.id === 'new') {
        return { title: 'Nou Pressupost | Ribot' };
    }
    return { title: 'Editar Pressupost | Ribot' };
}

// -------------------------------------------------------------------
// ✅ CORRECCIÓ Component de Pàgina: Esdevé async i resol params
// -------------------------------------------------------------------
// El Server Component ha de ser async per fer l'await.
export default async function QuoteEditorPage({ params }: QuoteEditorPageProps) {
    
    // ⚠️ CORRECCIÓ CLAU: Aquesta línia satisfà la validació de Next.js
    // i ens proporciona un objecte pla amb les propietats.
    const { id, locale } = await Promise.resolve(params);

    return (
        <div className="h-full">
            <Suspense fallback={<QuoteEditorSkeleton />}>
                {/* Passem les variables resoltes (id, locale) al component de dades */}
                <QuoteEditorData quoteId={id} locale={locale} />
            </Suspense>
        </div>
    );
}