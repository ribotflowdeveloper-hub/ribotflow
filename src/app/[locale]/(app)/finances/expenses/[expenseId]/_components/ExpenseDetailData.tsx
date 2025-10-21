import { notFound } from 'next/navigation';
import { fetchExpenseDetail } from '../actions';
import { ExpenseDetailClient } from './ExpenseDetailClient';
// Asumim que els tipus de dades (com 'ExpenseWithRelations') s'importen des d'un altre lloc si cal
// import type { ExpenseWithRelations } from '@/types/finances';

interface ExpenseDetailDataProps {
  expenseId: string;
}

export async function ExpenseDetailData({ expenseId: expenseIdProp }: ExpenseDetailDataProps) {
  // ✅ CORRECCI- 1: Renombrem la prop a l'entrada per evitar conflictes.
  //    'expenseIdProp' serà sempre el string ('new' o '123').
  
  const isNew = expenseIdProp === 'new';

  let expenseData = null;
  
  // Només executem la lògica de càrrega si NO és una nova despesa.
  if (!isNew) {
    // ✅ CORRECCIÓ 2: Creem una nova variable per a la versió numèrica.
    const numericExpenseId = parseInt(expenseIdProp, 10);

    // ✅ CORRECCIÓ 3: La validació ara és simple i segura, sense 'as number'.
    if (isNaN(numericExpenseId)) {
      console.error("Invalid expense ID:", expenseIdProp);
      notFound();
    }

    // Fem la crida a la base de dades amb l'ID numèric validat.
    expenseData = await fetchExpenseDetail(numericExpenseId);

    // Si no trobem la despesa, mostrem un 404.
    if (!expenseData) {
      notFound();
    }
  }

  // Passem les dades inicials (que poden ser 'null' si és 'new')
  // i l'indicador 'isNew' al component client.
  return (
    <ExpenseDetailClient
      initialData={expenseData}
      isNew={isNew}
    />
  );
}