/**
 * @file ExpensesData.tsx
 * @summary Componente de Servidor que carga los datos iniciales para la página de gastos.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ExpensesClient } from './expenses-client';

export async function ExpensesData() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Ejecutamos las consultas para gastos y proveedores en paralelo para mayor eficiencia.
  const [expensesRes, suppliersRes] = await Promise.all([
    // En la consulta inicial, solo pedimos los datos esenciales para la tabla.
    supabase.from('expenses').select('*, suppliers(nom), expense_attachments(id)').order('expense_date', { ascending: false }),
    supabase.from('suppliers').select('id, nom').order('nom')
  ]);

  if (expensesRes.error || suppliersRes.error) {
    console.error("Error al cargar los datos de gastos:", expensesRes.error || suppliersRes.error);
  }

  return <ExpensesClient initialExpenses={expensesRes.data || []} initialSuppliers={suppliersRes.data || []} />;
}