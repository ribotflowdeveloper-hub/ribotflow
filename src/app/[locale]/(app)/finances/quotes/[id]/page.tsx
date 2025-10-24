import { Suspense } from 'react';
import { type Metadata } from 'next';
import { QuoteEditorData } from './_components/QuoteEditorData';
import { QuoteEditorSkeleton } from './_components/QuoteEditorSkeleton';

// -------------------------------------------------------------------
// ✅ CORRECCIÓ: Definim el tipus de les props amb 'params' com una Promise
// -------------------------------------------------------------------
interface QuoteEditorPageProps {
    params: Promise<{ id: string; locale: string }>;
}

/**
 * Funció per generar metadades dinàmiques.
 */
export async function generateMetadata(props: QuoteEditorPageProps): Promise<Metadata> {
    // Resolem la promesa per accedir als paràmetres
    const { id } = await props.params;

    if (id === 'new') {
        return { title: 'Nou Pressupost | Ribot' };
    }
    return { title: `Editar Pressupost | Ribot` };
}

/**
 * Component de la pàgina per editar o crear un pressupost.
 */
// -------------------------------------------------------------------
// ✅ CORRECCIÓ: El component de pàgina esdevé 'async' i espera 'props.params'
// -------------------------------------------------------------------
export default async function QuoteEditorPage(props: QuoteEditorPageProps) {
    // Resolem la promesa per obtenir els valors de 'id' i 'locale'
    const { id, locale } = await props.params;

    return (
        <div className="h-full">
            <Suspense fallback={<QuoteEditorSkeleton />}>
                {/* Passem les variables ja resoltes al component de dades */}
                <QuoteEditorData quoteId={id} locale={locale} />
            </Suspense>
        </div>
    );
}