import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ContactDetailData } from './_components/ContactDetailData';
import { ContactDetailSkeleton } from './_components/ContactDetailSkeleton';

// Definim el tipus de les propietats, que ara poden arribar com una promesa
interface ContactDetailPageProps {
  params: Promise<{ contactId: string }>;
}

/**
 * Funció per generar metadades dinàmiques.
 */
export async function generateMetadata(props: ContactDetailPageProps): Promise<Metadata> {
  // ✅ CORRECCIÓ: Esperem que la promesa dels paràmetres es resolgui
  const { contactId } = await props.params;

  const supabase = createClient()
;
  
  const { data: contact } = await supabase
    .from('contacts')
    .select('nom')
    .eq('id', contactId)
    .single();

  return { title: `${contact?.nom || 'Contacte'} | Ribot` };
}

/**
 * La pàgina principal de detall de contacte.
 */
export default async function ContactDetailPage(props: ContactDetailPageProps) {
  // ✅ CORRECCIÓ: Esperem que la promesa dels paràmetres es resolgui
  const { contactId } = await props.params;

  return (
    <Suspense fallback={<ContactDetailSkeleton />}>
      {/* Passem l'ID ja resolt al component de dades */}
      <ContactDetailData contactId={contactId} />
    </Suspense>
  );
}