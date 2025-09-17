import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ContactDetailClient } from './contact-detail-client';
import type { Contact, Quote, Opportunity, Invoice, Activity } from '@/types/crm';

// Aquest component rep l'ID del contacte i fa tota la feina pesada
export async function ContactDetailData({ contactId }: { contactId: string }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Carreguem les dades principals del contacte
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
  
  if (error || !contact) {
    notFound(); 
  }

  // Carreguem totes les dades relacionades en paral·lel
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

  // Un cop tenim totes les dades, renderitzem el component de client
  return <ContactDetailClient initialContact={contact as Contact} initialRelatedData={relatedData} />;
}