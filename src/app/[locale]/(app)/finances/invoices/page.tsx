// /app/[locale]/(app)/finances/facturacio/page.tsx

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FacturacioData } from './_components/FacturacioData';
import { FacturacioSkeleton } from './_components/FacturacioSkeleton';

export const metadata: Metadata = {
  title: 'Facturació | Ribot',
};

// Ja no necessita 'searchParams'
export default function FacturacioPage() {
  return (
    <Suspense fallback={<FacturacioSkeleton />}>
      {/* Ja no passem cap prop */}
      <FacturacioData />
    </Suspense>
  );
}