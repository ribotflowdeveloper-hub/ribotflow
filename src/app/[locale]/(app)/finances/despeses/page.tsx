/**
 * @file page.tsx (Despeses)
 * @summary Aquest fitxer defineix la pàgina principal del mòdul de Gestió de Despeses.
 * Com a Component de Servidor, la seva funció principal és carregar la llista inicial
 * de despeses i proveïdors de l'usuari des de Supabase i passar-la al component de client
 * `ExpensesClient`, que s'encarregarà de la renderització i la interactivitat.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ExpensesClient } from './_components/expenses-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Despeses | Ribot',
};

// --- Definició de Tipus de Dades ---
// Aquests tipus defineixen l'estructura de les dades que es mouran entre el servidor i el client.
export type Supplier = { id: string; nom: string; };
export type ExpenseItem = { description: string; quantity: number; unit_price: number; };
export type ExpenseAttachment = { id: string; file_path: string; filename: string; mime_type: string; };
export type Expense = {
  id: string;
  created_at: string;
  user_id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  expense_date: string;
  category: string | null;
  description: string;
  subtotal: number;
  total_amount: number;
  // Propietats que representen relacions amb altres taules.
  suppliers: Supplier | null;
  expense_items: ExpenseItem[];
  expense_attachments: ExpenseAttachment[];
  // Altres camps opcionals.
  notes?: string | null;
  discount_amount?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
};

/**
 * @function DespesesPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function DespesesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Per a una millor eficiència, executem les consultes per a despeses i proveïdors en paral·lel.
  const [expensesRes, suppliersRes] = await Promise.all([
    // A la consulta inicial, només demanem les dades essencials per a la taula.
    // Les dades completes (ítems, adjunts) es carregaran al client quan es faci clic en una despesa.
    supabase.from('expenses').select('*, suppliers(nom), expense_attachments(id)').order('expense_date', { ascending: false }),
    supabase.from('suppliers').select('id, nom').order('nom')
  ]);

  if (expensesRes.error || suppliersRes.error) {
    console.error("Error en carregar les dades de despeses:", expensesRes.error || suppliersRes.error);
  }

  // Passem les dades carregades al component de client com a propietats inicials.
  return <ExpensesClient initialExpenses={expensesRes.data || []} initialSuppliers={suppliersRes.data || []} />;
}
