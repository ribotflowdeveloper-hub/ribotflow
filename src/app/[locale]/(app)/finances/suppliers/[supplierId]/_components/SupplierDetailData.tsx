import { notFound } from 'next/navigation';
import { fetchSupplierDetail } from '../../actions';
import { SupplierDetailClient } from './SupplierDetailClient';
import { fetchContactsForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';
import { fetchExpensesForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions';
import { fetchTicketsForSupplierContacts } from '@/app/[locale]/(app)/comunicacio/inbox/actions';
import { PageHeader } from '@/components/shared/PageHeader'; // Assegura't que s'importa aquí

import { getTranslations } from 'next-intl/server'; // Assegura't que s'importa aquí
// Rep l'objecte 'params' complet
interface SupplierDetailDataProps {
  params: { supplierId: string };
}

// Rep l'objecte 'params' complet
interface SupplierDetailDataProps {
  params: { supplierId: string };
}

export async function SupplierDetailData({ params }: SupplierDetailDataProps) {
  const supplierIdParam = params.supplierId; // Llegeix l'ID aquí
  const isNew = supplierIdParam === 'new';
  const supplierId = isNew ? null : supplierIdParam;

  const t = await getTranslations('SupplierDetailPage'); // Obté traduccions aquí
  const title = isNew ? t('createTitle') : t('editTitle');
  const description = isNew ? t('createDescription') : t('editDescription');

  if (isNew) {
    // Si és nou, retornem el client amb dades buides SENSE cridar al backend
    console.log("SupplierDetailData: Rendering NEW supplier form.");
    return (
      <SupplierDetailClient
        initialData={null}
        supplierId={null} // Passem null explícitament
        contacts={[]}
        expenses={[]}
        tickets={[]}
      />
    );
  }

  // --- Aquesta part NOMÉS s'executa si NO és nou ---
  console.log(`SupplierDetailData: Fetching data for existing supplier ID: ${supplierId}`);

  // Assegurem que supplierId no sigui null aquí (TypeScript ajuda)
  if (!supplierId) {
    // Això no hauria de passar si isNew és false, però és una guarda extra
    console.error("SupplierDetailData: supplierId is unexpectedly null when not new.");
    notFound();
  }

  const [
    supplierData,
    contactsData,
    expensesData,
    ticketsData
  ] = await Promise.all([
    fetchSupplierDetail(supplierId), // <-- Ara només rep un UUID vàlid
    fetchContactsForSupplier(supplierId),
    fetchExpensesForSupplier(supplierId),
    fetchTicketsForSupplierContacts(supplierId)
  ]);

  if (!supplierData) {
    console.log(`SupplierDetailData: Supplier with ID ${supplierId} not found.`);
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader // Renderitza el PageHeader aquí
        title={title}
        description={description}
        showBackButton={true}
      />
      <SupplierDetailClient
        initialData={supplierData}
        supplierId={supplierId} // Passem l'UUID vàlid
        contacts={contactsData || []}
        expenses={expensesData || []}
        tickets={ticketsData || []}
      />
    </div>
  );
}