import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ContactsClient } from './contacts-client';
import type { Contact } from '@/types/crm';

const ITEMS_PER_PAGE = 50;

// Aquest component ja està correcte, no necessita canvis.
export async function ContactsData({ page }: { page: string }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const currentPage = Number(page) || 1;
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const { data: contacts, error, count } = await supabase
    .from('contacts')
    .select('id, nom, empresa, email, estat, valor', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching contacts:", error.message);
    return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} />;
  }

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  return <ContactsClient initialContacts={contacts as Contact[] || []} totalPages={totalPages} currentPage={currentPage} />;
}