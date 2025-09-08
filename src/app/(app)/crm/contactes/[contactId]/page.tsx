import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ContactDetailClient } from './_components/contact-detail-client';
import type { Metadata } from 'next';
import { Contact } from '@/types/crm'; // ✅ CANVI: Importem el tipus central


export type Quote = { id: string; quote_number: string; status: string; total: number; };
export type Opportunity = { id: string; name: string; stage_name: string; value: number; };
export type Invoice = { id: string; invoice_number: string; status: string; total: number; };
export type Activity = { id: string; created_at: string; type: string; content: string; };

// Funció per generar les metadades dinàmiques (títol de la pàgina)
export async function generateMetadata({ params }: { params: { contactId: string } }): Promise<Metadata> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // ✅ CORRECCIÓ: Afegim 'await' per accedir a 'params' de forma segura
  const awaitedParams = await params;
  
  const { data: contact } = await supabase.from('contacts').select('nom').eq('id', awaitedParams.contactId).single();
  return { title: `${contact?.nom || 'Contacte'} | Ribot` };
}

// Aquesta és la pàgina del servidor
export default async function ContactDetailPage({ params }: { params: { contactId: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // ✅ CORRECCIÓ: Afegim 'await' per accedir a 'params' de forma segura
  const awaitedParams = await params;
  const contactId = awaitedParams.contactId;

  const { data: contact, error } = await supabase.from('contacts').select('*').eq('id', contactId).single();
  
  if (error || !contact) {
    notFound(); // Mostra una pàgina 404 estàndard si el contacte no existeix
  }

  // Obtenim totes les dades relacionades en paral·lel
  const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
    supabase.from('quotes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('opportunities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('activities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false })
  ]);

  const relatedData = {
    quotes: quotesRes.data || [],
    opportunities: oppsRes.data || [],
    invoices: invoicesRes.data || [],
    activities: activitiesRes.data || []
  };

  return <ContactDetailClient initialContact={contact} initialRelatedData={relatedData} />;
}