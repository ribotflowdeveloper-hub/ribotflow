// src/app/[locale]/(app)/finances/suppliers/page.tsx
import { Suspense } from 'react';
import { SuppliersData } from './_components/SuppliersData';
import { GenericDataTableSkeleton } from '@/components/shared/GenericDataTableSkeleton'; // Skeleton genèric

// Ja no necessitem rebre 'searchParams'
export default async function SuppliersListPage() {

  // Ajusta el nombre de columnes
  const defaultColumnCount = 5; // nom, email, telefon, created_at, actions

  return (
    // Ajustem padding/alçada si cal
    <div className="h-full">
      <Suspense fallback={<GenericDataTableSkeleton columnCount={defaultColumnCount} rowCount={10} showFiltersSkeleton={false} />}>
        {/* SuppliersData gestiona la càrrega */}
        <SuppliersData />
      </Suspense>
    </div>
  );
}