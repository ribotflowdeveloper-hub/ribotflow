import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CustomizationData } from './_components/CustomizationData';
import { CustomizationSkeleton } from './_components/CustomizationSkeleton';

export const metadata: Metadata = {
  title: 'Personalització | Ribot',
};

export type Stage = { id: string; name: string; };
export type Tag = { id: string; name: string; color: string; };

export default function CustomizationPage() {
  return (
    <Suspense fallback={<CustomizationSkeleton />}>
      <CustomizationData />
    </Suspense>
  );
}