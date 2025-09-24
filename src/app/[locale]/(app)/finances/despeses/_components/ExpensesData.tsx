import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ExpensesClient } from './expenses-client';

export async function ExpensesData() {
    const supabase = createClient(cookies());
    // L'autenticació i l'accés a les dades seran gestionats per les polítiques de RLS
    // basades en l'usuari i el seu 'active_team_id'.

    // ✅ Les consultes ara són molt més simples.
    // La base de dades s'encarregarà de filtrar automàticament les dades
    // que pertanyen a l'equip actiu de l'usuari.
    const [expensesRes, suppliersRes] = await Promise.all([
        supabase.from('expenses').select('*, suppliers(nom), expense_attachments(id)').order('expense_date', { ascending: false }),
        supabase.from('suppliers').select('id, nom').order('nom')
    ]);

    if (expensesRes.error || suppliersRes.error) {
        console.error("Error al cargar los datos de gastos:", expensesRes.error || suppliersRes.error);
        // Si hi ha un error (ex: l'usuari no té un equip actiu), Supabase retornarà un error de RLS.
        // Podem gestionar-lo aquí o deixar que el client mostri un missatge.
    }

    return <ExpensesClient initialExpenses={expensesRes.data || []} initialSuppliers={suppliersRes.data || []} />;
}