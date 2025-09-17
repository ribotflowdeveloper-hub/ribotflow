import type { Metadata } from 'next';
import { Suspense } from 'react';

// Importem els nostres nous components d'orquestració
import { ActivitiesData } from './_components/ActivitiesData';
import { ActivitiesSkeleton } from './_components/ActivitiesSkeleton';

export const metadata: Metadata = {
  title: 'Historial d\'Activitats | Ribot',
};

// Ja no necessitem definir el tipus 'Activity' aquí,
// ja que el gestionem dins de 'ActivitiesData' i 'activitats-client',
// que l'importen des del fitxer central 'src/types/crm.ts'.

// La pàgina principal ja no és 'async'. Es renderitza a l'instant.
export default function ActivitatsPage() {
  return (
    <Suspense fallback={<ActivitiesSkeleton />}>
      {/* Suspense mostrarà l'esquelet a l'instant, eliminant la "congelació".
        Mentrestant, <ActivitiesData /> carregarà les dades en segon pla.
      */}
      <ActivitiesData />
    </Suspense>
  );
}