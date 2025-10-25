// Exemple a src/app/[locale]/(app)/finances/expenses/page.tsx
import { Suspense } from 'react';
import { ExpensesData } from './_components/ExpensesData';
import { GenericDataTableSkeleton } from '@/components/shared/GenericDataTableSkeleton'; // Importa l'skeleton

export default async function ExpensesPage() {

  // Pots calcular columnCount basant-te en les columnes visibles per defecte o un nombre fix
  const defaultColumnCount = 7; // Ajusta segons les teves columnes + accions

  return (
    <div className="h-full"> {/* Assegura't que el contenidor té alçada */}
      <Suspense fallback={<GenericDataTableSkeleton columnCount={defaultColumnCount} rowCount={10} />}>
        {/* ExpensesData farà la crida asíncrona */}
        <ExpensesData />
      </Suspense>
    </div>
  );
}