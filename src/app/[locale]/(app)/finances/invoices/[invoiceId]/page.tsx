// src/app/[locale]/(app)/finances/invoices/[invoiceId]/page.tsx
import { Suspense } from 'react';
import { InvoiceDetailData } from './_components/InvoiceDetailData';
import { InvoiceDetailSkeleton } from './_components/InvoiceDetailSkeleton';
import { type PageProps } from '@/types/shared/next-page-props'; // Tipus genèric per a props de pàgina

type InvoiceDetailPageProps = PageProps; // Tipem els params esperats

// SRP: Gestiona el routing, Suspense i pas de paràmetres (invoiceId).
// DIP: Depèn de InvoiceDetailData.
export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  // Passem un *nou objecte* amb invoiceId (no l'objecte 'params' sencer)
  // Afegim una 'key' per assegurar el re-render correcte dins de Suspense si l'ID canvia (ex: de 'new' a ID)
  return (
    <Suspense fallback={<InvoiceDetailSkeleton />}>
      <InvoiceDetailData key={params.invoiceId} params={{ invoiceId: params.invoiceId }} />
    </Suspense>
  );
}