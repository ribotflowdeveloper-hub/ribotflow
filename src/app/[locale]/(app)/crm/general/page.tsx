// /app/[locale]/(app)/crm/general/page.tsx (Corregit)

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CrmData } from './_components/CrmData';
import { CrmSkeleton } from './_components/CrmSkeleton';
// ⛔ Ja no s'importa cap tipus des d'aquí.

export const metadata: Metadata = {
    title: 'CRM General | Ribot',
};

export default function CrmGeneralPage() {
    return (
        <Suspense fallback={<CrmSkeleton />}>
            <CrmData />
        </Suspense>
    );
}