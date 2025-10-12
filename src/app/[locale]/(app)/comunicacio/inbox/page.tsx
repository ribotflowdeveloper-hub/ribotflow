/**
 * @file src/app/[locale]/(app)/comunicacio/inbox/page.tsx
 */
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { InboxData } from './_components/InboxData';
import { InboxSkeleton } from './_components/InboxSkeleton';
import type { Ticket, Template } from '@/types/comunicacio/inbox';
import type { Contact } from '@/types/db';
export const metadata: Metadata = {
  title: 'Bandeja de Entrada | Ribot',
};

// Re-exportem els tipus per a la importació centralitzada
export type { Ticket, Template, Contact };

// ✅ 1. Definim el tipus de les propietats, indicant que 'searchParams' ÉS una promesa.
interface InboxPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * @summary La página principal del Inbox, que ara gestiona els paràmetres de manera asíncrona.
 */
// ✅ 2. La funció principal rep 'props' i és 'async'.
export default async function InboxPage(props: InboxPageProps) {
  // ✅ 3. Aquesta és la línia clau: fem 'await' per resoldre la promesa i obtenir els paràmetres.
  const searchParams = await props.searchParams;
  
  // A partir d'aquí, 'searchParams' ja és un objecte normal i podem treballar amb ell.
  const searchTerm = typeof searchParams?.q === 'string' ? searchParams.q : '';
  
  return (
    <Suspense key={searchTerm} fallback={<InboxSkeleton />}>
      {/* Passem el 'searchTerm' ja processat i segur com un string. */}
      <InboxData searchTerm={searchTerm} />
    </Suspense>
  );
}