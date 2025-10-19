// src/app/[locale]/(app)/finances/despeses/page.tsx
import { Suspense } from 'react';
import { ExpensesData } from './_components/ExpensesData';
import { ExpensesSkeleton } from './_components/ExpensesSkeleton';

/**
 * Pàgina principal (Server Component) per a la gestió de despeses.
 * * ✅ ARQUITECTURA CORRECTA:
 * 1. La Pàgina (page.tsx) no ha de contenir lògica de dades.
 * 2. Utilitzem <Suspense> per gestionar l'estat de càrrega.
 * 3. <ExpensesData> és el Server Component que s'encarrega de l'autenticació
 * i de la càrrega de dades inicial (les primeres 50).
 * 4. <ExpensesSkeleton> es mostra mentre <ExpensesData> està carregant.
 */
export default async function ExpensesPage() {
    return (
        <Suspense fallback={<ExpensesSkeleton />}>
            <ExpensesData />
        </Suspense>
    );
}