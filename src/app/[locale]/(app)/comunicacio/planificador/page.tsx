
// Modifica la pàgina per usar el component de dades amb Suspense
// src/app/[locale]/(app)/comunicacio/planificador/page.tsx
import { Suspense } from 'react';
import { SocialPlannerData } from './_components/SocialPlannerData';
import { SocialPlannerSkeleton } from './_components/SocialPlannerSkeleton'; // Importa el Skeleton

export default function SocialPlannerPage() {
    // La comprovació de pla i sessió ara es fa dins de SocialPlannerData
    return (
        <Suspense fallback={<SocialPlannerSkeleton />}>
            <SocialPlannerData />
        </Suspense>
    );
}