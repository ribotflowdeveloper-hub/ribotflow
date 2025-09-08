// Ruta del fitxer: src/app/(app)/crm/quotes/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QuoteEditorClient } from './_components/QuoteEditorClient';
import type { Metadata } from 'next';

// Funció per generar metadata dinàmica (Corregida)
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = params.id; // Accedim a 'id' una sola vegada
  if (id === 'new') {
    return { title: 'Nou Pressupost | Ribot' };
  }
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: quote } = await supabase.from('quotes').select('quote_number').eq('id', id).single();

  const title = quote ? `Editar Pressupost #${quote.quote_number}` : `Editar Pressupost`;
  return { title: `${title} | Ribot` };
}

// Definim tipus per a les dades que mourem entre servidor i client
export type QuoteItem = {
  id?: number;
  product_id?: number | null;
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
export type Contact = { id: string; nom: string; empresa: string; };
export type Product = { id: number; name: string; description?: string; price: number; };
export type CompanyProfile = { id: string; company_name?: string; company_tax_id?: string; company_address?: string; company_email?: string; company_phone?: string; logo_url?: string; } | null;
export type Opportunity = { id: number; name: string; stage_name: string; };


export default async function QuoteEditorPage({ params }: { params: { id: string } }) {
  const id = params.id; // Accedim a 'id' una sola vegada
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Càrrega de dades inicials en paral·lel
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
    if(lastQuote?.quote_number) {
        const match = lastQuote.quote_number.match(/-(\d+)$/);
        if(match) nextNumber = parseInt(match[1]) + 1;
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
      items: [{ description: '', quantity: 1, unit_price: 0 }]
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
        const { data: opportunitiesData } = await supabase.from('opportunities').select('*').eq('contact_id', quoteData.contact_id);
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

