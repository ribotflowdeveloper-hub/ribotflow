"use client";

import { type Supplier } from '@/lib/services/finances/suppliers/suppliers.service';
import { type ContactForSupplier } from '@/types/db'; 
import { type ExpenseForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions'; 
import { type TicketForSupplier } from '@/types/db';
import { useSupplierForm } from '../_hooks/useSupplierForm';
import { SupplierForm } from './SupplierForm'; 
import { RelatedDataTabs } from './tabs/RelateDataTabs'; 

// ✅ 1. Importem el que necessitem per l'alerta
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type UsageCheckResult } from '@/lib/subscription/subscription';

// ✅ 2. Actualitzem les Props
interface SupplierDetailClientProps {
  initialData: Supplier | null;
  supplierId: string | null;
  contacts: ContactForSupplier[];
  expenses: ExpenseForSupplier[];
  tickets: TicketForSupplier[];
  // Noves props
  userId: string;
  teamId: string;
  title: string;
  description: string;
  limitStatus: UsageCheckResult | null;
}

export function SupplierDetailClient({ 
  initialData, 
  supplierId, 
  contacts, 
  expenses, 
  tickets,
  // ✅ 3. Rebem les noves props
  userId,
  teamId,
  title,
  description,
  limitStatus
}: SupplierDetailClientProps) {
  
  // ✅ 4. Passem 'userId' i 'teamId' al hook
  const formProps = useSupplierForm({ initialData, supplierId, userId, teamId });
  const isNew = supplierId === null;

  // Hooks per a l'alerta
  const t_billing = useTranslations('Shared.limits');
  const locale = useLocale();

  // ✅ 5. Definim la variable per mostrar l'alerta
  const isLimitExceeded = !isNew && limitStatus && !limitStatus.allowed;

  return (
    <div className="flex flex-col gap-6">
      
      {/* ✅ 6. ALARMA DE LÍMIT SUPERAT (Només en edició) */}
      {isLimitExceeded && (
        <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900">
          <TriangleAlert className="h-4 w-4 text-yellow-900" />
          <AlertTitle className="font-semibold">
            {t_billing('modalTitle', { default: 'Límit assolit' })}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {limitStatus.error || t_billing('suppliers', { current: limitStatus.current, max: limitStatus.max })}
            <Button asChild variant="link" size="sm" className="px-1 h-auto py-0 text-yellow-900 font-semibold underline">
              <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* La resta del teu component */}
      <SupplierForm {...formProps} />

      {!isNew && supplierId && (
        <RelatedDataTabs 
          contacts={contacts}
          expenses={expenses}
          tickets={tickets}
          supplierId={supplierId} 
          supplierEmail={formProps.formData.email} 
          t={formProps.t} // El 't' ja ve del hook useSupplierForm
        />
      )}
    </div>
  );
}