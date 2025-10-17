// src/app/[locale]/(app)/finances/despeses/_components/ExpensesData.tsx

import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';
import { fetchExpenses } from '../actions'; // ✅ Funció Server Action
import { getTranslations } from 'next-intl/server';
import { createServerActionClient } from '@/lib/supabase/server'; 

/**
 * Server Component: Capa de Dades per a la llista de Despeses.
 * * ✅ El Per Què: Centralitza l'autenticació i l'obtenció de dades. 
 * Si la càrrega falla, activa el mecanisme d'error de Next.js (error.tsx).
 */
export async function ExpensesData() {
    // 1. Validació de Sessió (Patró de Next.js/Supabase)
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login'); 
    }
    
    const t = await getTranslations('ExpensesPage');
    
    // 2. Càrrega de Dades
    try {
        // Obtenim les despeses (amb el nom del proveïdor)
        const initialExpenses = await fetchExpenses(); 
        
        // 3. Renderitzat del Client Component
        // ✅ NOMÉS passem les despeses. La llista de proveïdors (si cal) es carregarà
        // només a la vista de detall/creació.
        return <ExpensesClient initialExpenses={initialExpenses || []} />;
        
    } catch (error) {
        // En cas d'error de Supabase a fetchExpenses, l'error ja s'ha llançat.
        // Aquí ens assegurem que el missatge sigui comprensible.
        console.error("Error durant la càrrega de ExpensesData:", error);
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades de la pàgina de despeses. Si us plau, intenta-ho de nou més tard.");
    }
}