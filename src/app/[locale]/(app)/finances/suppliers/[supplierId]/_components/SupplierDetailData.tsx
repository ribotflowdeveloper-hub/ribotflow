import { notFound } from 'next/navigation';
import { fetchSupplierDetail } from '../../actions';
import { SupplierDetailClient } from './SupplierDetailClient';
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
          supplierId={null}
          contacts={[]}
          expenses={[]}
          tickets={[]}
        />
      </div>
    );
  }

  const [
    supplierData,
    contactsData,
    expensesData,
    ticketsData
  ] = await Promise.all([
    fetchSupplierDetail(supplierId),
    fetchContactsForSupplier(supplierId),
    fetchExpensesForSupplier(supplierId),
    fetchTicketsForSupplierContacts(supplierId)
  ]);

  if (!supplierData) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        showBackButton={true}
      />
      {/* ✅ CORRECCIÓ: Passem les dades directament sense 'map'. */}
      {/* La funció 'fetchTicketsForSupplierContacts' ja retorna el tipus correcte. */}
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