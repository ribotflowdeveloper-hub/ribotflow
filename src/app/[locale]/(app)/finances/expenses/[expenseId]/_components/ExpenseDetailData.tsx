import { notFound } from 'next/navigation';
// Podries moure aquí 'getTranslations' i 'PageHeader' si vols la capçalera aquí
// import { getTranslations } from 'next-intl/server';
// import { PageHeader } from '@/components/shared/PageHeader';
import { fetchExpenseDetail } from '../actions';
import { ExpenseDetailClient } from './ExpenseDetailClient';

// Rep l'objecte 'params' complet
interface ExpenseDetailDataProps {
  params: { expenseId: string }; // Tipem 'params' directament
}

export async function ExpenseDetailData({ params }: ExpenseDetailDataProps) {
  // Llegim l'ID des dels params rebuts
  const expenseIdParam = params.expenseId;
  if (!expenseIdParam) {
     console.error("Expense ID not found in params:", params);
     notFound();
  }

  const isNew = expenseIdParam === 'new';
  // Convertim a número si no és 'new'
  const expenseId = isNew ? null : parseInt(expenseIdParam, 10); 

  // Validació
  if (!isNew && isNaN(expenseId as number)) {
      console.error("Invalid expense ID:", expenseIdParam);
      notFound();
  }

  // --- Lògica de Càrrega ---
  let expenseData = null;
  if (!isNew && expenseId !== null) {
      expenseData = await fetchExpenseDetail(expenseId);
      if (!expenseData) {
          notFound();
      }
  }

  // --- Opcional: Renderitzar PageHeader aquí ---
  // const t = await getTranslations('ExpenseDetailPage'); // O el context correcte
  // const title = isNew ? t('createTitle') : ... ;
  // const description = isNew ? t('createDescription') : ... ;

  return (
    // <div className="flex flex-col gap-6"> // <-- Si mous PageHeader aquí
      // <PageHeader title={title} description={description} showBackButton={true} />
      <ExpenseDetailClient
        initialData={expenseData}
        isNew={isNew}
        // Assegura't que ExpenseDetailClient ja NO espera 'allSuppliers'
      />
    // </div>
  );
}