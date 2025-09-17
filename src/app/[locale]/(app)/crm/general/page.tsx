import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CrmData } from './_components/CrmData';
import { CrmSkeleton } from './_components/CrmSkeleton'; // Importem l'esquelet
import { CrmData as CrmDataType } from '@/types/crm'; // Importem el tipus

export const metadata: Metadata = {
  title: 'CRM General | Ribot',
};

// Exportem el tipus aquí perquè CrmData.tsx el pugui utilitzar fàcilment
export type CrmData = CrmDataType;

// La pàgina principal ja no és 'async' i no gestiona l'autenticació
export default function CrmGeneralPage() {
  return (
    <Suspense fallback={<CrmSkeleton />}>
      <CrmData />
    </Suspense>
  );
}