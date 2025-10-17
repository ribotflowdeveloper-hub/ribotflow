// /app/finances/despeses/_components/ExpensesData.tsx

import { createClient } from '@/lib/supabase/server';

import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';

export async function ExpensesData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // --- LÒGICA D'EQUIP ACTIU DEFINITIVA ---
    const { data: claimsString, error: claimsError } = await supabase.rpc('get_current_jwt_claims');
    if (claimsError || !claimsString) {
        redirect('/settings/team');
    }
    const claims = JSON.parse(claimsString);
    if (!claims.app_metadata?.active_team_id) {
        redirect('/settings/team');
    }
    // ------------------------------------

    // Les consultes ara són segures i no necessiten filtres manuals.
    // La RLS filtrarà 'expenses' i 'suppliers' automàticament.
    const [expensesRes, suppliersRes] = await Promise.all([
        supabase.from('expenses').select('*, suppliers(nom), expense_attachments(id)').order('expense_date', { ascending: false }),
        supabase.from('suppliers').select('id, nom').order('nom')
    ]);
    // CANVI: En lloc d'un console.error, llancem un error de veritat.
    if (expensesRes.error || suppliersRes.error) {
        const error = expensesRes.error || suppliersRes.error;
        console.error("Error en carregar les dades de despeses:", error);
        // Això aturarà el renderitzat i farà que Next.js busqui el fitxer error.tsx més proper.
        throw new Error("No s'han pogut carregar les dades de la pàgina de despeses. Si us plau, intenta-ho de nou més tard.");
    }

    return <ExpensesClient initialExpenses={expensesRes.data || []} initialSuppliers={suppliersRes.data || []} />;
}