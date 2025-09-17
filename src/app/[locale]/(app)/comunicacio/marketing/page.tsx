/**
 * @file page.tsx (Marketing)
 * @summary Punt d'entrada per a la pàgina de Màrqueting, implementant React Suspense.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MarketingData } from './_components/MarketingData';
import { MarketingSkeleton } from './_components/MarketingSkeleton';

// Les metadades es queden igual.
export const metadata: Metadata = {
  title: 'Marketing | Ribot',
};

// --- Definició de Tipus de Dades ---
// Aquests tipus asseguren la consistència de les dades entre el servidor, el client i la base de dades.

export type Campaign = {
  id: string;
  name: string;
  type: string;
  status: 'Completat' | 'Actiu' | 'Planificat';
  campaign_date: string; // Utilitzem string per a una fàcil serialització.
  goal: string;
  target_audience: string;
  content: string;
};

export type Kpis = {
  totalLeads: number;
  conversionRate: number;
};

/**
* @function MarketingPage
* @summary Aquesta pàgina ja no és 'async'. Mostra un esquelet de càrrega
* mentre el component 'MarketingData' va a buscar les dades al servidor.
*/
export default function MarketingPage() {
 return (
   <Suspense fallback={<MarketingSkeleton />}>
     <MarketingData />
   </Suspense>
 );
}