/**
 * @file page.tsx (Facturació)
 * @summary Punto de entrada de la página, implementando React Suspense para carga optimizada.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FacturacioData } from './_components/FacturacioData';
import { FacturacioSkeleton } from './_components/FacturacioSkeleton';
// Ya no es necesario exportar los tipos desde aquí

export const metadata: Metadata = {
  title: 'Facturació | Ribot',
};

export default function FacturacioPage() {
  return (
    <Suspense fallback={<FacturacioSkeleton />}>
      <FacturacioData />
    </Suspense>
  );
}