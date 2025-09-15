// Aquest arxiu és el Server Component per a la pàgina de facturació.
// La seva única responsabilitat és carregar les dades inicials des del servidor.

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FacturacioClient } from './_components/FacturacioClient';
import type { Metadata } from 'next';

// Assegura que la pàgina es renderitzi dinàmicament a cada petició,
// garantint que les dades sempre estiguin actualitzades.
export const dynamic = 'force-dynamic';

// Metadades per al títol de la pàgina.
export const metadata: Metadata = {
  title: 'Facturació | Ribot',
};


// Definim els tipus de dades que farem servir
export type Contact = {
  id: string;
  nom: string;
};

export type InvoiceItem = {
  id?: string; // L'ID només existirà si ja està a la BD
  description: string;
  quantity: number;
  unit_price: number;
};

// El tipus principal de la factura, ara inclou un array de 'invoice_items'
export type Invoice = {
  id: string;
  user_id: string;
  contact_id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  status: 'Draft' | 'Issued' | 'Paid' | 'Overdue';
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  notes: string | null;
  created_at: string;
  // Dades del client i empresa desades per a la consistència
  company_name: string | null;
  client_name: string | null;
  // ... altres camps de Verifactu ...
  // Relacions
  contacts: Contact | null;
  invoice_items: InvoiceItem[];
};


/**
 * Funció principal de la pàgina del servidor.
 * S'encarrega de l'autenticació i la càrrega de dades.
 */
export default async function FacturacioPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verifiquem la sessió de l'usuari.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fem les consultes per obtenir les factures i els contactes en paral·lel
  // amb 'Promise.all' per a una millor eficiència.
  const [invoicesRes, contactsRes] = await Promise.all([
    supabase.from('invoices').select('*, contacts(id, nom)').eq('user_id', user.id).order('issue_date', { ascending: false }),
    supabase.from('contacts').select('id, nom').eq('user_id', user.id)
  ]);

  // Fem un 'cast' de les dades als nostres tipus definits per a més seguretat.
  const invoices = invoicesRes.data as Invoice[] || [];
  const contacts = contactsRes.data as Contact[] || [];

  // Passem les dades carregades al component de client, que s'encarregarà de la interactivitat.
  return (
    <FacturacioClient 
      initialInvoices={invoices} 
      initialContacts={contacts} 
    />
  );
}