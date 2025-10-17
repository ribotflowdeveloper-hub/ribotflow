// src/app/[locale]/(app)/finances/despeses/page.tsx
import { fetchExpenses } from './actions';
import { ExpensesClient } from './_components/ExpensesClient';

/**
 * Pàgina principal (Server Component) per a la gestió de despeses.
 * La seva única responsabilitat és carregar les dades inicials.
 */
export default async function ExpensesPage() {
    // ✅ CORRECCIÓ: Cridem fetchExpenses amb un objecte de filtres buit
    // per a la càrrega inicial de totes les despeses.
    const initialExpenses = await fetchExpenses({});

    // Passem les dades inicials al component client, que s'encarregarà de la interactivitat.
    return (
        <ExpensesClient initialExpenses={initialExpenses} />
    );
}