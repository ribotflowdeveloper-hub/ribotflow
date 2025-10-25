// src/app/[locale]/(app)/finances/invoices/page.tsx
import { Suspense } from 'react';
import { InvoicesData } from './_components/InvoicesData';
// ❗ Canvia InvoicesSkeleton per GenericDataTableSkeleton si vols usar el genèric
import { GenericDataTableSkeleton } from '@/components/shared/GenericDataTableSkeleton';

// Ja no necessitem rebre 'searchParams' aquí directament
export default async function InvoicesListPage() {

  // Definim el nombre de columnes per a l'skeleton (ajusta segons les teves columnes visibles per defecte)
  const defaultColumnCount = 7; // invoice_number, client_name, issue_date, total_amount, status, edit action + delete action (implícit)

  return (
    // La 'key' ja no és necessària si la lògica de paràmetres és interna al hook
    <Suspense fallback={<GenericDataTableSkeleton columnCount={defaultColumnCount} rowCount={10} />}>
      {/* InvoicesData ara gestiona la càrrega inicial */}
      <InvoicesData />
    </Suspense>
  );
}