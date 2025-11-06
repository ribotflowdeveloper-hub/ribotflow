import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchExpenseDetail } from '../actions';
import { ExpenseDetailClient } from './ExpenseDetailClient';

// ✅ 1. Importem els guardians, permisos, límits i serveis necessaris
import { 
  validateActionAndUsage, 
  validateSessionAndPermission 
} from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { type PlanLimit } from '@/config/subscriptions';
import { AccessDenied } from '@/components/shared/AccessDenied'; // Component de bloqueig
import { getUsageLimitStatus } from '@/lib/subscription/subscription';

// (No necessitem importar 'products' o 'suppliers' aquí,
// ja que els teus components 'ExpenseItemsEditor' i 'SupplierCombobox'
// no els reben com a props, són autònoms)

interface ExpenseDetailDataProps {
  expenseId: string;
}

export async function ExpenseDetailData({ expenseId: expenseIdProp }: ExpenseDetailDataProps) {
  const t = await getTranslations('ExpenseDetailPage'); // Assegura't que 'ExpenseDetailPage' existeix
  const isNew = expenseIdProp === 'new';

  // --- Lògica per a una NOVA despesa ---
  if (isNew) {
    // ✅ 2. CAPA 2: Validació de CREACIÓ (Permís + Límit)
    const limitToCheck: PlanLimit = 'maxExpensesPerMonth';
    const validation = await validateActionAndUsage(
      PERMISSIONS.MANAGE_EXPENSES,
      limitToCheck
    );

    // Si la validació falla (sense permís O límit assolit), no mostrem el formulari.
    if ('error' in validation) {
      console.warn(`[ExpenseDetailData] Bloquejada creació de despesa: ${validation.error.message}`);
      return (
        <AccessDenied 
          title={t('errors.limitReachedTitle') || 'Límit assolit'}
          message={validation.error.message}
          backUrl="/finances/expenses"
        />
      );
    }

    // Validació superada
    const { user, activeTeamId } = validation;

    return (
      <ExpenseDetailClient
        initialData={null}
        isNew={true}
        // Passem les dades necessàries al client i al hook
        userId={user.id}
        teamId={activeTeamId}
        title={t('title.new') || 'Nova Despesa'}
        description={t('createDescription') || 'Registra una nova despesa.'}
        limitStatus={null} // No cal avís, ja sabem que està permès
      />
    );
  }

  // --- Lògica de càrrega per a una despesa EXISTENT ---
  
  // ✅ 3. CAPA 2: Validació d'EDICIÓ (Només permís de gestió)
  // Permetem editar encara que el límit de creació estigui superat
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);

  if ('error' in validation) {
    console.warn(`[ExpenseDetailData] Bloquejada edició de despesa: ${validation.error.message}`);
    notFound(); // No té permís per editar
  }
  
  const { user, activeTeamId } = validation;

  const numericExpenseId = parseInt(expenseIdProp, 10);
  if (isNaN(numericExpenseId)) {
    notFound();
  }

  // ✅ 4. Carreguem dades de la despesa I l'estat del límit (per l'alerta)
  const [
    expenseData, 
    limitStatus
  ] = await Promise.all([
    fetchExpenseDetail(numericExpenseId), // La teva acció de càrrega
    getUsageLimitStatus('maxExpensesPerMonth' as PlanLimit) // Per l'alerta
  ]);

  // Validem la despesa
  if (!expenseData || expenseData.team_id !== activeTeamId) {
    notFound();
  }

  const title = t('editTitle', { number: expenseData?.invoice_number ?? expenseIdProp });
  const description = t('editDescription') || 'Edita els detalls de la despesa.';

  return (
    <ExpenseDetailClient
      initialData={expenseData}
      isNew={isNew}
      userId={user.id} 
      teamId={activeTeamId}
      title={title}
      description={description}
      limitStatus={limitStatus} // ✅ 5. Passem l'estat del límit al client per l'alerta
    />
  );
}