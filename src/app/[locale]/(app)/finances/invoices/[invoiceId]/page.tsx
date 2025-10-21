import { Suspense } from 'react';
import { InvoiceDetailData } from './_components/InvoiceDetailData';
import { InvoiceDetailSkeleton } from './_components/InvoiceDetailSkeleton';

// ❌ Eliminem la importació del tipus genèric que causa el conflicte.
// import { type PageProps } from '@/types/shared/next-page-props';

// ✅ Definim la interfície localment amb 'params' com a Promise.
interface InvoiceDetailPageProps {
  params: Promise<{
    locale: string;
    invoiceId: string;
  }>;
}

/**
 * Component de pàgina per al detall d'una factura.
 */
export default async function InvoiceDetailPage(props: InvoiceDetailPageProps) {
  
  // ✅ Resolem la promesa per obtenir l'ID.
  const { invoiceId } = await props.params;

  return (
    <Suspense fallback={<InvoiceDetailSkeleton />}>
      {/* ✅ Simplifiquem: Passem només l'string 'invoiceId' com a prop.
          La 'key' aquí és una bona pràctica per forçar el re-renderitzat. */}
      <InvoiceDetailData key={invoiceId} invoiceId={invoiceId} />
    </Suspense>
  );
}