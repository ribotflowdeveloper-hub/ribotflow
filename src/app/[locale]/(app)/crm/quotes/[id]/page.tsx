import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server'; // [6]
import { QuoteEditorData } from './_components/QuoteEditorData'; // [6]
import { QuoteEditorSkeleton } from './_components/QuoteEditorSkeleton'; // [6]

// ✅ CORRECCIÓ 1: generateMetadata ha d'esperar que els params es resolguin.
// Tipifiquem 'params' com una Promise per satisfer l'await intern.
interface MetadataProps {
    params: Promise<{ id: string }>; // <-- CANVI CLAU
}

/**
 * Funció per generar metadades dinàmiques.
 */
export async function generateMetadata(props: MetadataProps): Promise<Metadata> {
    const { id } = await props.params; // 👈 L'await és ara consistent amb el tipus definit

    if (id === 'new') {
        return { title: 'Nou Pressupost | Ribot' }; // [6]
    }

    // Utilitzem createClient amb cookies, que és el patró recomanat [7]
    const supabase = createClient(); 
    
    // Consulta de dades per a les metadades [6]
    const { data: quote } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('id', id)
        .single();

    const title = quote ? `Editar Pressupost #${quote.quote_number}` : 'Editar Pressupost';
    return { title: `${title} | Ribot` }; // [8]
}

// ✅ CORRECCIÓ 2: El component principal ha d'esperar que els params es resolguin.
interface PageProps {
    params: Promise<{ 
        id: string; 
        locale: string; // Incloem 'locale' perquè és al path de l'App Router [8]
    }>; // <-- CANVI CLAU
}

/**
 * Funció principal de la pàgina del servidor.
 */
export default async function QuoteEditorPage({ params }: PageProps) {
    
    // ✅ 3. Aquest 'await' ara és vàlid ja que 'params' és de tipus Promise [8]
    const { id, locale } = await params; 

    return (
        // L'ús de Suspense millora l'experiència d'usuari durant la càrrega de dades [9-12]
        <Suspense fallback={<QuoteEditorSkeleton />}>
            {/* QuoteEditorData és un Server Component que s'encarrega del data fetching [13] */}
            <QuoteEditorData quoteId={id} locale={locale} /> 
        </Suspense>
    );
}