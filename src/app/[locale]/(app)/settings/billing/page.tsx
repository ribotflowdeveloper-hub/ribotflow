/**
 * @file page.tsx (Billing)
 * @summary Punt d'entrada de la pàgina de Facturació, implementant Suspense.
 */
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BillingData } from './_components/BillingData';
import { BillingSkeleton } from './_components/BillingSkeleton';

export const dynamic = 'force-dynamic';

// ✅ CORRECCIÓ 1: Definim la interfície de les propietats
// indicant que 'params' pot ser una promesa.
interface BillingPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Funció per generar metadades dinàmiques (el títol de la pàgina).
 */
export async function generateMetadata(props: BillingPageProps): Promise<Metadata> {
  // ✅ CORRECCIÓ 2: Fem 'await' per resoldre la promesa i obtenir els paràmetres.
  const { locale } = await props.params;
  
  const t = await getTranslations({ locale, namespace: 'SettingsPage.billing' });
  return { title: `${t('metaTitle')} | Ribot` };
}

/**
 * La pàgina principal de Facturació.
 */
export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingData />
    </Suspense>
  );
}