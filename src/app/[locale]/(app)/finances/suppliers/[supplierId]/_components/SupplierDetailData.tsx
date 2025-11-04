// /app/[locale]/(app)/finances/suppliers/[supplierId]/_components/SupplierDetailData.tsx (FITXER CORREGIT)
// ✅ CORRECCIÓ: Importem l'acció local de detall
import { fetchSupplierDetail } from '../actions';
import { SupplierDetailClient } from './SupplierDetailClient';
// ✅ Imports correctes per a dades relacionades
import { fetchContactsForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';
import { fetchExpensesForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions';
import { fetchTicketsForSupplierContacts } from '@/app/[locale]/(app)/comunicacio/inbox/actions';
import { PageHeader } from '@/components/shared/PageHeader';
import { getTranslations } from 'next-intl/server';

interface SupplierDetailDataProps {
  supplierId: string;
}

export async function SupplierDetailData({ supplierId }: SupplierDetailDataProps) {
  const isNew = supplierId === 'new';

  const t = await getTranslations('SupplierDetailPage');
  const title = isNew ? t('createTitle') : t('editTitle');
  const description = isNew ? t('createDescription') : t('editDescription');

  if (isNew) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={title}
          description={description}
          showBackButton={true}
        />
        <SupplierDetailClient
          initialData={null}
          supplierId={null} // Passem null per a 'new'
          contacts={[]}
          expenses={[]}
          tickets={[]}
        />
      </div>
    );
  }

  // Càrrega de dades en paral·lel
  const [
    supplierData,
    contactsData,
    expensesData,
    ticketsData
  ] = await Promise.all([
    fetchSupplierDetail(supplierId), // ✅ Crida a l'acció local
    fetchContactsForSupplier(supplierId),
    fetchExpensesForSupplier(supplierId),
    fetchTicketsForSupplierContacts(supplierId)
  ]);

  // 'fetchSupplierDetail' ja llança notFound() si no troba dades
  // (Ho hem definit al servei)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        showBackButton={true}
      />
      <SupplierDetailClient
        initialData={supplierData}
        supplierId={supplierId}
        contacts={contactsData || []}
        expenses={expensesData || []}
        tickets={ticketsData || []}
      />
    </div>
  );
}