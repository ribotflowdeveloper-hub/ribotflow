/**
 * @file src/app/[locale]/(app)/comunicacio/inbox/page.tsx (VERSIÓ FINAL)
 */
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { InboxData } from './_components/InboxData';
import { InboxSkeleton } from './_components/InboxSkeleton';

export const metadata: Metadata = {
  title: 'Bandeja de Entrada | Ribot',
};

// Aquesta pàgina ja no necessita cap prop. És un component estàtic.
export default function InboxPage() {
  return (
    // Sense 'key' dinàmica. El client gestionarà els canvis.
    <Suspense fallback={<InboxSkeleton />}>
      <InboxData />
    </Suspense>
  );
}