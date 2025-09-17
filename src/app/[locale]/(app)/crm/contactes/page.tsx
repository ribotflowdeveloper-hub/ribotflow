import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ContactsData } from './_components/ContactsData';
import { ContactsSkeleton } from './_components/ContactsSkeleton';

export const metadata: Metadata = { title: 'Contactes | Ribot' };

// Definim el tipus de les propietats, que ara poden ser una promesa
interface ContactesPageProps {
  searchParams: Promise<{ page?: string }>;
}

// ✅ CORRECCIÓ: La pàgina rep 'props' i fa 'await' per obtenir els paràmetres
export default async function ContactesPage(props: ContactesPageProps) {
  const searchParams = await props.searchParams;
  const page = searchParams?.page || '1';

  return (
    <Suspense key={page} fallback={<ContactsSkeleton />}>
      {/* Passem el número de pàgina ja resolt */}
      <ContactsData page={page} />
    </Suspense>
  );
}