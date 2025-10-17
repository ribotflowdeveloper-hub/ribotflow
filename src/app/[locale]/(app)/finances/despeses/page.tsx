// src/app/[locale]/(app)/finances/despeses/page.tsx
import { fetchExpenses } from './actions';
import { ExpensesClient } from './_components/ExpensesClient';
import { ExpensesSkeleton } from './_components/ExpensesSkeleton'; // Assumint que existeix

export default async function ExpensesPage() {
    // Carreguem les dades al servidor
    const initialExpenses = await fetchExpenses();

    if (!initialExpenses) {
        // En cas d'error greu, mostrem el skeleton o un missatge d'error
        return <ExpensesSkeleton />; 
    }

    return (
        // Client Component per a la interactivitat
        <ExpensesClient initialExpenses={initialExpenses} />
    );
}