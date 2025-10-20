import { Suspense } from 'react';
import { type PageProps } from '@/types/shared/next-page-props';
import { ExpenseDetailData } from './_components/ExpenseDetailData';
import { ExpenseDetailSkeleton } from './_components/ExpenseDetailSkeleton'; 

type ExpenseDetailPageProps = PageProps; // El tipus PageProps ja inclou params

/**
 * ✅ CORRECCIÓ: Afegim 'async' a la definició del component de pàgina.
 * * Això resol l'error 'params should be awaited' indicant a Next.js
 * que aquesta ruta dinàmica gestiona correctament l'accés als 'params'
 * en el seu arbre de components (especialment dins de <Suspense>).
 */
export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  return (
    <Suspense fallback={<ExpenseDetailSkeleton />}>
      {/* Passem només 'expenseId' al component de dades.
        Això és correcte, ja que 'params' aquí conté { locale, expenseId },
        però ExpenseDetailData només espera { expenseId }.
      */}
      <ExpenseDetailData params={{ expenseId: params.expenseId }} />
    </Suspense>
  );
}