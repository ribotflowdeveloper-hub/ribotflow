import { Suspense } from 'react';
import { type PageProps } from '@/types/shared/next-page-props';
import { ExpenseDetailData } from './_components/ExpenseDetailData';
import { ExpenseDetailSkeleton } from './_components/ExpenseDetailSkeleton'; // Assegura't que existeix

type ExpenseDetailPageProps = PageProps; // El tipus PageProps ja inclou params

// Component Pàgina Simplificat: Només passa params
export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  return (
    <Suspense fallback={<ExpenseDetailSkeleton />}>
      {/* Passem només l'objecte amb expenseId */}
      <ExpenseDetailData params={{ expenseId: params.expenseId }} />
    </Suspense>
  );
}