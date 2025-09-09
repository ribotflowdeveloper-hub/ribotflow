// Ruta del fitxer: src/app/(app)/crm/quotes/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QuoteEditorClient } from './_components/QuoteEditorClient';
import type { Metadata } from 'next';

// Forcem el renderitzat dinàmic per a més seguretat.
export const dynamic = 'force-dynamic';

// ✅ Fix a generateMetadata
export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params; // 👈 Await abans d'accedir-hi

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  if (id === 'new') {
    return { title: 'Nou Pressupost | Ribot' };
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('id', id)
    .single();

  const title = quote
    ? `Editar Pressupost #${quote.quote_number}`
    : `Editar Pressupost`;

  return { title: `${title} | Ribot` };
}


// Definim tipus per a les dades que mourem entre servidor i client
export type QuoteItem = {
  id?: number;
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
};
export type Quote = {
  id: string | 'new';
  contact_id: string | null;
  opportunity_id?: number | null;
  quote_number: string;
  issue_date: string;
  expiry_date?: string | null;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  notes: string;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  sent_at?: string | null;
  items: QuoteItem[];
};
export type Contact = { id: string; nom: string; empresa: string | null; };
export type Product = { id: number; name: string; description?: string | null; price: number; };
export type CompanyProfile = { id: string; user_id: string; company_name?: string | null; company_tax_id?: string | null; company_address?: string | null; company_email?: string | null; company_phone?: string | null; logo_url?: string | null; } | null;
export type Opportunity = { id: number; name: string; stage_name: string; };


// ✅ Fix a la page
export default async function QuoteEditorPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params; // 👈 Await abans d'usar-lo

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const [contactsRes, productsRes, profileRes] = await Promise.all([
    supabase.from('contacts').select('id, nom, empresa').eq('user_id', user.id),
    supabase.from('products').select('*').eq('user_id', user.id),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
  ]);

  const contacts = contactsRes.data || [];
  const products = productsRes.data || [];
  const companyProfile = profileRes.data;

  let initialQuote: Quote;
  let contactOpportunities: Opportunity[] = [];

  if (id === 'new') {
    const { data: lastQuote } = await supabase
      .from('quotes')
      .select('quote_number')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

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
      subtotal: 0,
      tax: 0,
      total: 0,
      items: [{ description: '', quantity: 1, unit_price: 0, product_id: null }]
    };
  } else {
    const { data: quoteData } = await supabase
      .from('quotes')
      .select('*, items:quote_items(*)')
      .eq('id', id)
      .single();

    if (quoteData) {
      initialQuote = quoteData;
      if (quoteData.contact_id) {
        const { data: opportunitiesData } = await supabase
          .from('opportunities')
          .select('*')
          .eq('contact_id', quoteData.contact_id);
        contactOpportunities = opportunitiesData || [];
      }
    } else {
      return redirect('/crm/quotes');
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
