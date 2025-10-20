// src/app/[locale]/(app)/finances/invoices/page.tsx
import { Suspense } from 'react';
import { InvoicesData } from './_components/InvoicesData';
import { InvoicesSkeleton } from './_components/InvoicesSkeleton';

type InvoicesPageProps = {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string; // Nom 'search' per consistència amb Expenses
    status?: string;
    contactId?: string;
    sortBy?: string;
    sortOrder?: string;
  };
};

// ✅ Pàgina ASYNC
export default async function InvoicesListPage({ searchParams }: InvoicesPageProps) {
  // ✅ Llegim valors primitius
  const page = searchParams?.page ?? '1';
  const pageSize = searchParams?.pageSize ?? '10'; // Ajusta default
  const search = searchParams?.search; // Nom 'search'
  const status = searchParams?.status;
  const contactId = searchParams?.contactId;
  const sortBy = searchParams?.sortBy;
  const sortOrder = searchParams?.sortOrder;

  return (
    <Suspense fallback={<InvoicesSkeleton />}>
      {/* ✅ Passem props primitives */}
      <InvoicesData
        page={page}
        pageSize={pageSize}
        search={search} // Nom 'search'
        status={status}
        contactId={contactId}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </Suspense>
  );
}