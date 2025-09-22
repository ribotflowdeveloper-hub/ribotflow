import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { QuoteEditorData } from './_components/QuoteEditorData';
import { QuoteEditorSkeleton } from './_components/QuoteEditorSkeleton';

// Definim un tipus per a les propietats que esperem.
// Next.js pot passar els paràmetres com una promesa.
interface QuoteEditorPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Funció per generar metadades dinàmiques.
 */
export async function generateMetadata(props: QuoteEditorPageProps): Promise<Metadata> {
  // ✅ CORRECCIÓ CLAU: Esperem la promesa dels paràmetres.
  const { id } = await props.params;

  if (id === 'new') {
    return { title: 'Nou Pressupost | Ribot' };
  }

  const supabase = createClient(cookies())
;
  const { data: quote } = await supabase.from('quotes').select('quote_number').eq('id', id).single();
  
  const title = quote ? `Editar Pressupost #${quote.quote_number}` : 'Editar Pressupost';
  return { title: `${title} | Ribot` };
}

/**
 * Funció principal de la pàgina del servidor.
 */
export default async function QuoteEditorPage(props: QuoteEditorPageProps) {
  // ✅ CORRECCIÓ CLAU: Esperem la promesa dels paràmetres aquí també.
  const { id } = await props.params;

  return (
    <Suspense fallback={<QuoteEditorSkeleton />}>
      <QuoteEditorData quoteId={id} />
    </Suspense>
  );
}