// Ruta: src/app/(app)/crm/contactes/[contactId]/page.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ContactDetailClient } from './_components/contact-detail-client';
import type { Metadata } from 'next';
import type { Contact, Quote, Opportunity, Invoice, Activity } from '@/types/crm';

// ✅ PAS 1: Definim el tipus de les props dient que 'params' és una Promise.
type ContactDetailPageProps = {
  params: Promise<{
    contactId: string;
  }>;
};

// La funció de metadades també ha d'esperar la Promise.
export async function generateMetadata({ params }: ContactDetailPageProps): Promise<Metadata> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Resolem la promesa per obtenir els paràmetres.
  const resolvedParams = await params;
  
  const { data: contact } = await supabase.from('contacts').select('nom').eq('id', resolvedParams.contactId).single();
  
  return { title: `${contact?.nom || 'Contacte'} | Ribot` };
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // ✅ PAS 2: El primer que fem a la funció és resoldre la Promise amb 'await'.
  const resolvedParams = await params;
  const { contactId } = resolvedParams;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

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