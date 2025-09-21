/**
 * @file FacturacioData.tsx
 * @summary Componente de Servidor que carga los datos iniciales para la página de facturación.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FacturacioClient } from './FacturacioClient';
import type { Invoice, Contact } from '../types';

export async function FacturacioData() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // El middleware ya debería haber redirigido

  const [invoicesRes, contactsRes] = await Promise.all([
    supabase.from('invoices').select('*, contacts(id, nom)').eq('user_id', user.id).order('issue_date', { ascending: false }),
    supabase.from('contacts').select('id, nom').eq('user_id', user.id)
  ]);

  if (invoicesRes.error || contactsRes.error) {
    console.error("Error al cargar datos de facturación:", invoicesRes.error || contactsRes.error);
  }

  const invoices = invoicesRes.data as Invoice[] || [];
  const contacts = contactsRes.data as Contact[] || [];

  return <FacturacioClient initialInvoices={invoices} initialContacts={contacts} />;
}