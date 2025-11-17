// Exemple a src/app/[locale]/(app)/finances/expenses/page.tsx
import { Suspense } from 'react';
import { ExpensesData } from './_components/ExpensesData';
import { GenericDataTableSkeleton } from '@/components/shared/GenericDataTableSkeleton'; // Importa l'skeleton

// ✅ Definim la interfície localment amb 'params' com a Promise.
interface ExpensesDetailPageProps {
  params: Promise<{
    locale: string;
    expenseId: string;
  }>;
}

export default async function ExpensesPage(props: ExpensesDetailPageProps) {

  // Pots calcular columnCount basant-te en les columnes visibles per defecte o un nombre fix
  const defaultColumnCount = 7; // Ajusta segons les teves columnes + accions
  // ✅ Resolem la promesa per obtenir l'ID.
  const { expenseId } = await props.params;
  return (
    <div className="h-full"> {/* Assegura't que el contenidor té alçada */}
      <Suspense fallback={<GenericDataTableSkeleton columnCount={defaultColumnCount} rowCount={10} />}>
        {/* ExpensesData farà la crida asíncrona */}
        <ExpensesData searchParams={{ expenseId }} />
      </Suspense>
    </div>
  );
}