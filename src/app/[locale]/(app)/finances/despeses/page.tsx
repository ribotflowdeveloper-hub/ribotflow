/**
 * @file page.tsx (Despeses)
 * @summary Punto de entrada de la página, implementando React Suspense para carga optimizada.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ExpensesData } from './_components/ExpensesData';
import { ExpensesSkeleton } from './_components/ExpensesSkeleton';

export const metadata: Metadata = {
  title: 'Despeses | Ribot',
};

// Ya no necesitamos exportar los tipos desde aquí.

export default function DespesesPage() {
  return (
    <Suspense fallback={<ExpensesSkeleton />}>
      <ExpensesData />
    </Suspense>
  );
}