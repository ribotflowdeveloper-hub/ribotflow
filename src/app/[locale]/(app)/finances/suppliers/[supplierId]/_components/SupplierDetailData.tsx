import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { fetchSupplierDetail } from '../actions';
import { SupplierDetailClient } from './SupplierDetailClient';
import { fetchContactsForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';
import { fetchExpensesForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions';
import { fetchTicketsForSupplierContacts } from '@/app/[locale]/(app)/comunicacio/inbox/actions';
import { type TicketForSupplier } from '@/types/db';

// ✅ 1. Importem guardians, permisos, límits i serveis necessaris
import { 
  validateActionAndUsage, 
  validateSessionAndPermission 
} from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { type PlanLimit } from '@/config/subscriptions';
import { AccessDenied } from '@/components/shared/AccessDenied'; 
import { getUsageLimitStatus } from '@/lib/subscription/subscription';

interface SupplierDetailDataProps {
  supplierId: string;
}

export async function SupplierDetailData({ supplierId }: SupplierDetailDataProps) {
  const isNew = supplierId === 'new';
  const t = await getTranslations('SupplierDetailPage');
  const title = isNew ? t('createTitle') : t('editTitle');
  const description = isNew ? t('createDescription') : t('editDescription');

  // --- Lògica per a un NOU proveïdor ---
  if (isNew) {
    // ✅ 2. CAPA 2: Validació de CREACIÓ (Permís + Límit)
    const limitToCheck: PlanLimit = 'maxSuppliers';
    const validation = await validateActionAndUsage(
      PERMISSIONS.MANAGE_SUPPLIERS,
      limitToCheck
    );

    if ('error' in validation) {
      console.warn(`[SupplierDetailData] Bloquejada creació de proveïdor: ${validation.error.message}`);
      return (
        <AccessDenied 
          title={t('errors.limitReachedTitle') || 'Límit assolit'}
          message={validation.error.message}
          backUrl="/finances/suppliers"
        />
      );
    }

    // Validació superada
    const { user, activeTeamId } = validation;

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
          // ✅ 3. Passem les noves props
          userId={user.id} 
          teamId={activeTeamId}
          title={title}
          description={description}
          limitStatus={null} // No cal avís
        />
      </div>
    );
  }

  // --- Lògica de càrrega per a un proveïdor EXISTENT ---

  // ✅ 4. CAPA 2: Validació d'EDICIÓ (Només permís)
  // Les accions de fetch (com fetchSupplierDetail) ja estan protegides
  // per 'validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES)',
  // per la qual cosa una validació explícita aquí és redundant si només és per llegir.
  // Però la necessitem per obtenir 'user' i 'teamId' de manera segura.
  const validation = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ('error' in validation) {
      // Si no pot veure finances, no pot veure el detall.
      throw new Error(validation.error.message);
  }
  
  const { user, activeTeamId } = validation;
  
  // ✅ 5. Carreguem dades I l'estat del límit (per l'alerta)
  const [
    supplierData,
    contactsData,
    expensesData,
    limitStatus // <-- NOU
  ] = await Promise.all([
    fetchSupplierDetail(supplierId),
    fetchContactsForSupplier(supplierId),
    fetchExpensesForSupplier(supplierId),
    getUsageLimitStatus('maxSuppliers' as PlanLimit) // <-- Crida per l'alerta
  ]);

  let ticketsData: TicketForSupplier[] = [];
  if (contactsData && contactsData.length > 0) {
    try {
      ticketsData = await fetchTicketsForSupplierContacts(supplierId);
    } catch (error) {
      console.error("Error en fetchTicketsForSupplierContacts (SupplierDetailData):", error);
      ticketsData = []; 
    }
  }

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
        // ✅ 6. Passem les noves props
        userId={user.id}
        teamId={activeTeamId}
        title={title}
        description={description}
        limitStatus={limitStatus} // Passem l'estat del límit
      />
    </div>
  );
}