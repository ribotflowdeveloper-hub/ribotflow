import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { QuotesClient } from './QuotesClient';
import type { QuoteWithContact } from '../page';

/**
 * @summary Server Component asíncron que carrega les dades dels pressupostos.
 */
export async function QuotesData() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Si no hi ha usuari, podem retornar el client amb dades buides
    // ja que la pàgina principal s'encarregarà de la redirecció.
    return <QuotesClient initialQuotes={[]} />;
  }

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*, contacts(nom, empresa)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar els pressupostos:", error);
    return <QuotesClient initialQuotes={[]} />;
  }
  
  // Assegurem el tipus de dades abans de passar-les
  const typedQuotes = (quotes as QuoteWithContact[]) || [];

  return <QuotesClient initialQuotes={typedQuotes} />;
}