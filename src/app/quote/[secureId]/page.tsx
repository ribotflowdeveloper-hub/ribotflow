// fitxer: src/app/quote/[secureId]/page.tsx

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { PublicQuoteClient } from './PublicQuoteClient';

type PublicQuotePageProps = {
  params: Promise<{ secureId: string }>;
};

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  
  // Creem un client públic i directe per carregar les dades inicials
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { secureId } = await params;

  const { data: quoteData, error } = await supabase
    .from('quotes')
    .select(`
      *,
      contacts (*),
      profiles (*),
      quote_items (*)
    `)
    .eq('secure_id', secureId)
    .single();

  if (error) {
    console.error("Error carregant les dades del pressupost:", error.message);
    notFound();
  }

  if (!quoteData) {
    notFound();
  }

  // @ts-ignore
  return <PublicQuoteClient initialQuoteData={quoteData} />;
}