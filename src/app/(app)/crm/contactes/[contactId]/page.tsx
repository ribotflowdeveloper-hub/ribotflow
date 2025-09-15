/**
 * @file page.tsx (Detall de Contacte)
 * @summary Aquest fitxer defineix la pàgina de detall per a un contacte específic.
 * És un Component de Servidor Dinàmic de Next.js. La seva funció és:
 * 1. Obtenir l'ID del contacte des de la URL.
 * 2. Generar metadades dinàmiques (com el títol de la pàgina) basades en el nom del contacte.
 * 3. Carregar de manera segura des del servidor les dades completes d'aquest contacte i tota la informació relacionada (pressupostos, factures, etc.).
 * 4. Passar totes aquestes dades al component de client `ContactDetailClient`, que s'encarregarà de la visualització i la interacció.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { ContactDetailClient } from './_components/contact-detail-client';
import type { Metadata } from 'next';
import type { Contact, Quote, Opportunity, Invoice, Activity } from '@/types/crm';

// Definim el tipus de les propietats (props) que rep la pàgina.
// Next.js passa els paràmetres de la ruta (com 'contactId') dins d'un objecte 'params'.
type ContactDetailPageProps = {
  params: {
    contactId: string;
  };
};

/**
 * @summary Funció especial de Next.js per generar metadades dinàmiques al servidor.
 * En aquest cas, crea un títol de pàgina personalitzat amb el nom del contacte.
 * @param {ContactDetailPageProps} props - Les propietats de la pàgina, incloent l'ID del contacte.
 * @returns {Promise<Metadata>} Un objecte de metadades per al <head> de la pàgina.
 */
export async function generateMetadata({ params }: ContactDetailPageProps): Promise<Metadata> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: contact } = await supabase.from('contacts').select('nom').eq('id', params.contactId).single();
  
  return { title: `${contact?.nom || 'Contacte'} | Ribot` };
}

/**
 * @function ContactDetailPage
 * @summary El component de servidor asíncron que construeix la pàgina de detall.
 */
export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { contactId } = params; // Extraiem l'ID del contacte dels paràmetres de la ruta.

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Carreguem les dades principals del contacte.
  const { data: contact, error } = await supabase.from('contacts').select('*').eq('id', contactId).single();
  
  // Si hi ha un error o el contacte no es troba, mostrem una pàgina 404.
  if (error || !contact) {
    notFound(); 
  }

  // Per optimitzar, carreguem totes les dades relacionades (pressupostos, oportunitats, etc.) en paral·lel.
  const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
    supabase.from('quotes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('opportunities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
    supabase.from('activities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false })
  ]);

  // Organitzem les dades relacionades en un únic objecte per passar-lo al component de client.
  const relatedData = {
    quotes: (quotesRes.data as Quote[]) || [],
    opportunities: (oppsRes.data as Opportunity[]) || [],
    invoices: (invoicesRes.data as Invoice[]) || [],
    activities: (activitiesRes.data as Activity[]) || []
  };

  // Finalment, renderitzem el component de client, passant-li totes les dades carregades com a propietats inicials.
  return <ContactDetailClient initialContact={contact as Contact} initialRelatedData={relatedData} />;
}
