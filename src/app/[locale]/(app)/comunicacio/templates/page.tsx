/**
 * @file page.tsx (Templates)
 * @summary Componente de Página que implementa React Suspense para una carga instantánea.
 */
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TemplatesData } from './_components/TemplatesData';
import { TemplatesSkeleton } from './_components/TemplatesSkeleton';

export const metadata: Metadata = {
  title: 'Plantilles d\'Email | Ribot',
};

// El tipo de dato puede vivir aquí o en un fichero centralizado (ej: src/types/comunicacio.ts)
export type EmailTemplate = {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
};

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesSkeleton />}>
      <TemplatesData />
    </Suspense>
  );
}