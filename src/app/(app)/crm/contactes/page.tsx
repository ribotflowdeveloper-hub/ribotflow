import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ContactsClient } from './_components/contacts-client';
import type { Metadata } from 'next';
import { Contact } from '@/types/crm'; // ✅ CANVI: Importem el tipus central

export const metadata: Metadata = {
  title: 'Contactes | Ribot',
};



export default async function ContactesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
  }

  return <ContactsClient initialContacts={contacts || []} />;
}