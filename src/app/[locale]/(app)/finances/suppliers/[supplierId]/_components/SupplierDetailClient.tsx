// /app/[locale]/(app)/finances/suppliers/[supplierId]/_components/SupplierDetailClient.tsx (FITXER CORREGIT)
"use client";

// Import tipus
// ✅ 1. Importem el tipus Supplier des del SERVEI
import { type Supplier } from '@/lib/services/finances/suppliers/suppliers.service';
// ✅ 2. Importem els tipus de dades relacionades des dels seus SERVEIS/TIPUS
import { type ContactForSupplier } from '@/types/db'; // Assumint que aquest és el teu tipus
import { type ExpenseForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions'; // Aquest encara ve de 'actions'
import { type TicketForSupplier } from '@/types/db';
// Import hooks i components
import { useSupplierForm } from '../_hooks/useSupplierForm';
import { SupplierForm } from './SupplierForm'; 
import { RelatedDataTabs } from './tabs/RelateDataTabs'; 

interface SupplierDetailClientProps {
  initialData: Supplier | null;
  supplierId: string | null;
  contacts: ContactForSupplier[];
  expenses: ExpenseForSupplier[];
  tickets: TicketForSupplier[];
}

export function SupplierDetailClient({ 
  initialData, 
  supplierId, 
  contacts, 
  expenses, 
  tickets 
}: SupplierDetailClientProps) {
  
  const formProps = useSupplierForm({ initialData, supplierId });
  const isNew = supplierId === null;

  return (
    <div className="flex flex-col gap-6">
      <SupplierForm {...formProps} />

      {!isNew && supplierId && ( // ✅ Assegurem que supplierId no és null
        <RelatedDataTabs 
          contacts={contacts}
          expenses={expenses}
          tickets={tickets}
          supplierId={supplierId} 
          supplierEmail={formProps.formData.email} 
          t={formProps.t} 
        />
      )}
    </div>
  );
}