/**
 * @file page.tsx (Network)
 * @summary Punto de entrada de la página, implementando React Suspense.
 */

import { Suspense } from 'react';
import { NetworkData } from './_components/NetworkData';
import { NetworkSkeleton } from './_components/NetworkSkeleton';

// La revalidación cada hora es una buena práctica.
export const revalidate = 3600;

export default function NetworkPage() {
  return (
    <Suspense fallback={<NetworkSkeleton />}>
      <NetworkData />
    </Suspense>
  );
}