// FITXER: app/[locale]/(app)/crm/quotes/[id]/page.ts

import { notFound } from 'next/navigation';
import { PublicQuoteClient } from './_components/PublicQuoteClient';
import { getQuoteDataBySecureId } from './_components/PublicQuoteData';

// 👇 CORRECCIÓ: 'params' és un objecte, no una Promise.
//    El nom de la propietat ha de coincidir amb el nom del directori dinàmic, que és '[id]'.
type PageProps = {
  params: Promise<{ secureId: string }>;
};

export default async function PublicQuotePage({ params }: PageProps) {
  // 👇 CORRECCIÓ: No cal fer 'await' a 'params'. Accedeix directament.
 const { secureId: userId } = await params;
  
  // Utilitzem 'id' per a obtenir les dades.
  const quoteData = await getQuoteDataBySecureId(userId);

  if (!quoteData) {
    notFound();
  }

  return <PublicQuoteClient initialQuoteData={quoteData} />;
}