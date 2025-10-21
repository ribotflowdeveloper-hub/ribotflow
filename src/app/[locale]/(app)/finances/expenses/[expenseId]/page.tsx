import { Suspense } from 'react';
import { ExpenseDetailData } from './_components/ExpenseDetailData';
import { ExpenseDetailSkeleton } from './_components/ExpenseDetailSkeleton';

// -------------------------------------------------------------------
// ✅ CORRECCIÓ: Definim la interfície localment amb 'params' com a Promise
//    en lloc d'importar un tipus genèric que causa conflictes.
// -------------------------------------------------------------------
interface ExpenseDetailPageProps {
  params: Promise<{
    locale: string;
    expenseId: string;
  }>;
}

/**
 * Component de la pàgina de detall d'una despesa.
 */
// -------------------------------------------------------------------
// ✅ CORRECCIÓ: El component esdevé 'async' i espera 'props.params'
// -------------------------------------------------------------------
export default async function ExpenseDetailPage(props: ExpenseDetailPageProps) {
  
  // Resolem la promesa per obtenir els paràmetres
  const { expenseId } = await props.params;

  return (
    <Suspense fallback={<ExpenseDetailSkeleton />}>
      {/* Passem l'ID ja resolt al component de dades.
        No cal embolcallar-ho en un objecte { params: ... } si el component fill
        només espera l'ID directament. Això fa el codi més net.
        (He ajustat <ExpenseDetailData> per reflectir això)
      */}
      <ExpenseDetailData expenseId={expenseId} />
    </Suspense>
  );
}