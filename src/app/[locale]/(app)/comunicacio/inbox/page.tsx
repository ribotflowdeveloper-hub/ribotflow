import { Suspense } from 'react';
import type { Metadata } from 'next';
import { InboxData } from './_components/InboxData';
import { InboxSkeleton } from './_components/InboxSkeleton';
import type { Ticket, Template } from '@/types/comunicacio/inbox';
import type { Contact } from '@/types/crm'

export const metadata: Metadata = {
  title: 'Safata d\'Entrada | Ribot',
};

export type { Ticket, Template, Contact };

// Definim el tipus de les propietats
interface InboxPageProps {
  searchParams?: { q?: string };
}

// ✅ CORRECCIÓ: La pàgina rep 'props' i fa 'await' per obtenir els paràmetres
export default async function InboxPage(props: InboxPageProps) {
  const searchParams = await props.searchParams;
  const searchTerm = searchParams?.q || '';
  
  return (
    <Suspense key={searchTerm} fallback={<InboxSkeleton />}>
      <InboxData searchParams={searchParams} />
    </Suspense>
  );
}