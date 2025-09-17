import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProductsData } from './_components/ProductsData';
import { ProductsSkeleton } from './_components/ProductsSkeleton';

export const metadata: Metadata = {
  title: 'Conceptes | Ribot',
};

// Ja no necessitem definir el tipus 'Product' aquí, ja que ve del fitxer central.

/**
 * @summary La pàgina principal de Productes, que ara actua com a orquestrador de Suspense.
 * Aquest component es renderitza a l'instant.
 */
export default function ProductsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Suspense fallback={<ProductsSkeleton />}>
        {/* Suspense mostrarà l'esquelet a l'instant, eliminant la "congelació".
          Mentrestant, <ProductsData /> carregarà els productes en segon pla.
        */}
        <ProductsData />
      </Suspense>
    </div>
  );
}