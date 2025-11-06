/**
 * @file src/app/[locale]/(app)/page.tsx (Pipeline Page)
 * @summary Aquest és el Server Component que carrega les dades inicials (l'esquelet)
 * i les passa al component de client.
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';

// Importem els nous components
import { PipelineData } from './_components/PipelineData';
import { PipelineSkeleton } from './_components/PipelineSkeleton';
// ✅ SOLUCIÓ: Forcem la pàgina a ser dinàmica
export const dynamic = 'force-dynamic';


export const metadata: Metadata = {
  title: 'Pipeline | Ribot',
};
// IMPORTANT: La pàgina principal JA NO ÉS 'async'
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {

  return (
    <Suspense fallback={<PipelineSkeleton stages={[]} viewMode="columns" />}>
      {/* React 'Suspense' intentarà renderitzar <PipelineData />.
        Com que és un component 'async', se suspendrà.
        Mentre està suspès, mostrarà el 'fallback' (el teu Skeleton).
        Quan les dades de PipelineData estiguin llestes, el substituirà.
      */}
      <PipelineData searchParams={searchParams} />    
      </Suspense>
  );
}