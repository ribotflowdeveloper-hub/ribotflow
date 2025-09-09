import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ExpensesClient } from './_components/expenses-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Despeses | Ribot',
};

// Definim els tipus de dades que necessitarem
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
  // Relacions
  suppliers: Supplier | null;
  expense_items: ExpenseItem[];
  expense_attachments: ExpenseAttachment[];
  // Altres camps que puguis tenir
  notes?: string | null;
  discount_amount?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
};

export default async function DespesesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  const [expensesRes, suppliersRes] = await Promise.all([
    supabase.from('expenses').select('*, suppliers(nom), expense_attachments(id)').order('expense_date', { ascending: false }),
    supabase.from('suppliers').select('id, nom').order('nom')
  ]);

  if (expensesRes.error || suppliersRes.error) {
    console.error("Error fetching expenses data:", expensesRes.error || suppliersRes.error);
  }

  return <ExpensesClient initialExpenses={expensesRes.data || []} initialSuppliers={suppliersRes.data || []} />;
}