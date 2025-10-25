// /app/[locale]/(app)/crm/products/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProductsData } from './_components/ProductsData';
// Importem l'skeleton genèric
import { GenericDataTableSkeleton } from '@/components/shared/GenericDataTableSkeleton';

export const metadata: Metadata = {
  title: 'Conceptes | Ribot', // O 'Productes | Ribot'
};

export default function ProductsPage() {
  // Ajusta el nombre de columnes segons la teva taula
  const defaultColumnCount = 7; // name, category, price, vat, unit, active, actions

  return (
    // Ajustem padding si cal, o deixem que el Client ho gestioni
    <div className="h-full"> {/* Assegura't que el contenidor té alçada */}
      <Suspense fallback={<GenericDataTableSkeleton columnCount={defaultColumnCount} rowCount={15} />}>
        <ProductsData />
      </Suspense>
    </div>
  );
}