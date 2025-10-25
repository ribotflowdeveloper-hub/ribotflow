// /app/[locale]/(app)/crm/quotes/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { QuotesData } from './_components/QuotesData'; // Component de dades refactoritzat
import { GenericDataTableSkeleton } from '@/components/shared/GenericDataTableSkeleton'; // Skeleton genèric

export const metadata: Metadata = {
  title: 'Pressupostos | Ribot',
};

// Ja no necessitem rebre props aquí
export default async function QuotesPage() {

  // Ajusta el nombre de columnes
  const defaultColumnCount = 6; // number, client, issue_date, total, status, actions

  return (
    // Ajustem padding/alçada
    <div className="h-full">
      <Suspense fallback={<GenericDataTableSkeleton columnCount={defaultColumnCount} rowCount={10} />}>
        {/* QuotesData gestiona la càrrega inicial */}
        <QuotesData />
      </Suspense>
    </div>
  );
}