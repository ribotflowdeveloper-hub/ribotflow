// /app/finances/facturacio/_components/FacturacioData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FacturacioClient } from './FacturacioClient';
import type { Invoice, Contact } from '../types'; 
import type {  Product } from '@/types/crm/products'; 

// /app/[locale]/(app)/finances/facturacio/_components/FacturacioData.tsx

// ✅ LA FUNCIÓ ARA REP PROPS SIMPLES (STRINGS), NO 'searchParams'
export async function FacturacioData({
  status,
  sortBy,
  order
}: {
  status?: string;
  sortBy?: string;
  order?: string;
}) {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from('invoices')
    .select('*, contacts(id, nom), invoice_items(*)')
    .eq('user_id', user.id);

  // ✅ UTILITZEM LES PROPS DIRECTAMENT
  if (status) {
    query = query.eq('status', status);
  }

  // ✅ LA LÒGICA D'ORDENACIÓ ARA ÉS MOLT MÉS NETA
  if (sortBy && (order === 'asc' || order === 'desc')) {
      const ascending = order === 'asc';
      if (sortBy.includes('.')) {
        const [referencedTable, referencedColumn] = sortBy.split('.');
        query = query.order(referencedColumn, { referencedTable, ascending });
      } else {
        query = query.order(sortBy, { ascending });
      }
  } else {
    // Ordenació per defecte
    query = query.order('issue_date', { ascending: false });
  }

  // La resta del component es queda exactament igual
  const [invoicesRes, contactsRes, productsRes] = await Promise.all([
    query,
    supabase.from('contacts').select('id, nom').eq('user_id', user.id),
    supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true)
  ]);

  if (invoicesRes.error || contactsRes.error || productsRes.error) {
    console.error("Error al carregar dades:", invoicesRes.error || contactsRes.error || productsRes.error);
  }

  const invoices = invoicesRes.data as Invoice[] || [];
  const contacts = contactsRes.data as Contact[] || [];
  const products = productsRes.data as Product[] || [];

  return <FacturacioClient initialInvoices={invoices} initialContacts={contacts} initialProducts={products} />;
}