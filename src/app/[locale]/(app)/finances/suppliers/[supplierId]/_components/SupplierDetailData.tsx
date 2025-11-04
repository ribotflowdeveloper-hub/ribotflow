// /app/[locale]/(app)/finances/suppliers/[supplierId]/_components/SupplierDetailData.tsx (FITXER CORREGIT)
import { fetchSupplierDetail } from '../actions';
import { SupplierDetailClient } from './SupplierDetailClient';
import { fetchContactsForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';
import { fetchExpensesForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions';
import { fetchTicketsForSupplierContacts } from '@/app/[locale]/(app)/comunicacio/inbox/actions';
import { PageHeader } from '@/components/shared/PageHeader';
import { getTranslations } from 'next-intl/server';

// ✅ 1. Importem el tipus que falta
import { type TicketForSupplier } from '@/types/db';

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

  // 1. Càrrega de dades principals en paral·lel
  const [
    supplierData,
    contactsData,
    expensesData
  ] = await Promise.all([
    fetchSupplierDetail(supplierId),
    fetchContactsForSupplier(supplierId),
    fetchExpensesForSupplier(supplierId)
  ]);

  // 2. Càrrega de dades dependents (Tiquets)
  
  // ✅ 2. Donem el tipus explícit a la variable
  let ticketsData: TicketForSupplier[] = []; // Inicialitzem a buit
  
  if (contactsData && contactsData.length > 0) {
    try {
      // Només busquem tiquets si el proveïdor té contactes
      ticketsData = await fetchTicketsForSupplierContacts(supplierId);
    } catch (error) {
      console.error("Error en fetchTicketsForSupplierContacts (SupplierDetailData):", error);
      // No aturem la càrrega de la pàgina, simplement no hi haurà tiquets.
      ticketsData = []; 
    }
  }

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
        tickets={ticketsData || []} // Passem les dades (plenes o buides)
      />
    </div>
  );
}