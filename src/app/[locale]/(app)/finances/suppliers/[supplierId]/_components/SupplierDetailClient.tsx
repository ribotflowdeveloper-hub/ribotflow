"use client";

// Import tipus
import { type Supplier } from '@/types/finances/suppliers';
import { type ContactForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';
import { type ExpenseForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions';
import { type TicketForSupplier } from '@/app/[locale]/(app)/comunicacio/inbox/actions';

// Import hooks i components
import { useSupplierForm } from '../_hooks/useSupplierForm';
import { SupplierForm } from './SupplierForm'; // Nou component
import { RelatedDataTabs } from './tabs/RelateDataTabs'; // Nou component

// Props que rep del Server Component (SupplierDetailData)
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
  
  // Hook per al formulari principal
  const formProps = useSupplierForm({ initialData, supplierId });
  const isNew = supplierId === null;

  return (
    <div className="flex flex-col gap-6">
      {/* Component dedicat al formulari */}
      <SupplierForm {...formProps} />

      {/* Component dedicat a les pestanyes (només si no és nou) */}
      {!isNew && (
        <RelatedDataTabs 
          contacts={contacts}
          expenses={expenses}
          tickets={tickets}
          supplierId={supplierId} // Passa l'ID per als botons "Nou"
          supplierEmail={formProps.formData.email} // Passa l'email per al botó "Cercar Inbox"
          t={formProps.t} // Passa la funció de traducció
        />
      )}
    </div>
  );
}