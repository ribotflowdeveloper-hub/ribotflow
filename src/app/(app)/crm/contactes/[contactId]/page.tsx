// Ruta: src/app/(app)/crm/contactes/[contactId]/page.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ContactDetailClient } from './_components/contact-detail-client';
import type { Metadata } from 'next';
import type { Contact, Quote, Opportunity, Invoice, Activity } from '@/types/crm'; // Assegura't que la ruta a 'types' és correcta

// ✅ 1. AQUEST ÉS L'ÚNIC TIPUS QUE NECESSITEM PER A LES PROPS D'AQUESTA PÀGINA
type Props = {
  params: {
    contactId: string;
  };
};

// La funció de metadades ja hauria d'estar correcta així
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: contact } = await supabase.from('contacts').select('nom').eq('id', params.contactId).single();
  
  return { title: `${contact?.nom || 'Contacte'} | Ribot` };
}

// ✅ 2. AQUESTA ÉS LA SIGNATURA CORRECTA I SIMPLE DE LA PÀGINA
// Assegura't que la teva funció es vegi exactament així, sense tipus genèrics com <PageProps>.
export default async function ContactDetailPage({ params }: Props) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  const { contactId } = params;

  const { data: contact, error } = await supabase.from('contacts').select('*').eq('id', contactId).single();
  
  if (error || !contact) {
    notFound(); 
  }

  const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
    supabase.from('quotes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('opportunities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('activities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false })
  ]);

  const relatedData = {
    quotes: (quotesRes.data as Quote[]) || [],
    opportunities: (oppsRes.data as Opportunity[]) || [],
    invoices: (invoicesRes.data as Invoice[]) || [],
    activities: (activitiesRes.data as Activity[]) || []
  };

  return <ContactDetailClient initialContact={contact as Contact} initialRelatedData={relatedData} />;
}