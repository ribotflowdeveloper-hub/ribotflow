import { notFound } from 'next/navigation';
import { fetchSupplierDetail } from '../../actions';
import { SupplierDetailClient } from './SupplierDetailClient';

// ✅ 1. Importem la nostra nova acció
import { fetchContactsForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';

interface SupplierDetailDataProps {
  supplierId: string | null; // Null si és 'new'
}

export async function SupplierDetailData({ supplierId }: SupplierDetailDataProps) {
  const isNew = supplierId === null;

  if (isNew) {
    // Si és un proveïdor nou, no hi ha res a carregar,
    // ni dades de proveïdor, ni contactes associats.
    return (
      <SupplierDetailClient 
        initialData={null} 
        supplierId={null}
        contacts={[]} // ✅ 2. Passem un array buit
      />
    );
  }

  // Si estem editant, fem les dues crides a la BD en paral·lel
  const [supplierData, contactsData] = await Promise.all([
    fetchSupplierDetail(supplierId),
    fetchContactsForSupplier(supplierId)
  ]);

  if (!supplierData) {
    notFound();
  }

  return (
    <SupplierDetailClient 
      initialData={supplierData} 
      supplierId={supplierId} 
      contacts={contactsData || []} // ✅ 3. Passem els contactes al client
    />
  );
}