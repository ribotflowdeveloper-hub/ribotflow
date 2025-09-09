// Ruta del fitxer: src/app/(app)/finances/facturacio/page.tsx
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FacturacioClient } from './_components/FacturacioClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Facturació | Ribot',
};

// Definim els tipus de dades que farem servir
export type Contact = {
  id: string;
  nom: string;
};

export type Invoice = {
  id: number;
  contact_id: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  contacts: Contact | null;
};

export default async function FacturacioPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtenim les dades en paral·lel per a més eficiència
  const [invoicesRes, contactsRes] = await Promise.all([
    supabase.from('invoices').select('*, contacts(id, nom)').eq('user_id', user.id).order('issue_date', { ascending: false }),
    supabase.from('contacts').select('id, nom').eq('user_id', user.id)
  ]);

  const invoices = invoicesRes.data as Invoice[] || [];
  const contacts = contactsRes.data as Contact[] || [];

  return (
    <FacturacioClient 
      initialInvoices={invoices} 
      initialContacts={contacts} 
    />
  );
}
