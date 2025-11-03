// src/app/[locale]/(app)/comunicacio/templates/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TemplatesData } from './_components/TemplatesData';
import { TemplatesSkeleton } from './_components/TemplatesSkeleton';

export const metadata: Metadata = {
  title: 'Plantilles d\'Email | Ribot',
};

// ❌ ELIMINAT: El 'type EmailTemplate' s'ha mogut a src/types/db.ts
// export type EmailTemplate = { ... };

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesSkeleton />}>
      <TemplatesData />
    </Suspense>
  );
}