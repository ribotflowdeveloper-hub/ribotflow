import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QuoteEditorClient } from './QuoteEditorClient';
import type { Quote, Contact, Product, CompanyProfile, Opportunity } from '@/types/crm';

interface QuoteEditorDataProps {
  quoteId: string;
}

/**
 * @summary Server Component asíncron que gestiona tota la lògica de càrrega de dades per a l'editor.
 */
export async function QuoteEditorData({ quoteId }: QuoteEditorDataProps) {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Carreguem les dades auxiliars en paral·lel
  const [contactsRes, productsRes, profileRes] = await Promise.all([
    supabase.from('contacts').select('id, nom, empresa').eq('user_id', user.id),
    supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
  ]);

  const contacts = (contactsRes.data as Contact[]) || [];
  const products = (productsRes.data as Product[]) || [];
  const companyProfile = profileRes.data as CompanyProfile;

  let initialQuote: Quote;
  let contactOpportunities: Opportunity[] = [];
  
  // Lògica per a un NOU pressupost
  if (quoteId === 'new') {
    const { data: lastQuote } = await supabase.from('quotes').select('quote_number').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
    let nextNumber = 1;
    if (lastQuote?.quote_number) {
      const match = lastQuote.quote_number.match(/\d+$/);
      if (match) nextNumber = parseInt(match[0]) + 1;
    }
    const year = new Date().getFullYear();

    initialQuote = {
      id: 'new',
      contact_id: null,
      quote_number: `PRE-${year}-${String(nextNumber).padStart(4, '0')}`,
      issue_date: new Date().toISOString().slice(0, 10),
      status: 'Draft',
      notes: 'Gràcies pel vostre interès en els nostres serveis.',
      discount: 0,
      subtotal: 0, tax: 0, total: 0,
      items: [{ description: '', quantity: 1, unit_price: 0, product_id: null }]
    };
  } else {
    // Lògica per a un pressupost EXISTENT
    const { data: quoteData } = await supabase.from('quotes').select('*, items:quote_items(*)').eq('id', quoteId).single();
    if (!quoteData) redirect('/crm/quotes');

    initialQuote = quoteData as unknown as Quote;
    
    if (quoteData.contact_id) {
      const { data: opportunitiesData } = await supabase.from('opportunities').select('*').eq('contact_id', quoteData.contact_id);
      contactOpportunities = (opportunitiesData as Opportunity[]) || [];
    }
  }

  return (
    <QuoteEditorClient
      initialQuote={initialQuote}
      contacts={contacts}
      products={products}
      companyProfile={companyProfile}
      initialOpportunities={contactOpportunities}
    />
  );
}