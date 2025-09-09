// Ruta: src/app/(app)/crm/contactes/[contactId]/page.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ContactDetailClient } from './_components/contact-detail-client';
import type { Metadata } from 'next';
import type { Contact, Quote, Opportunity, Invoice, Activity } from '@/types/crm';

// Aquest tipus està perfecte.
type ContactDetailPageProps = {
  params: {
    contactId: string;
  };
};

export async function generateMetadata({ params }: ContactDetailPageProps): Promise<Metadata> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: contact } = await supabase.from('contacts').select('nom').eq('id', params.contactId).single();
  
  return { title: `${contact?.nom || 'Contacte'} | Ribot` };
}

// 👇👇👇 AQUESTA LÍNIA ÉS LA MÉS IMPORTANT! 👇👇👇
// Assegura't que la teva funció es veu EXACTAMENT així, sense <...> després del nom.
export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
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