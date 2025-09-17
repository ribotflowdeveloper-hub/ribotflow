/**
 * @file page.tsx (Integrations)
 * @summary Punt d'entrada de la pàgina d'Integracions, implementant React Suspense.
 */
import { Suspense } from 'react';
import { IntegrationsData } from './_components/IntegrationsData';
import { IntegrationsSkeleton } from './_components/IntegrationsSkeleton';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

// ✅ CORRECCIÓ DEFINITIVA 1: Definim el tipus de les propietats
// indicant que 'params' pot arribar com una promesa.
interface IntegrationsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Funció per generar metadades dinàmiques (el títol de la pàgina).
 */
export async function generateMetadata(props: IntegrationsPageProps): Promise<Metadata> {
  // ✅ CORRECCIÓ DEFINITIVA 2: Fem 'await' per resoldre la promesa i obtenir els paràmetres.
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: 'SettingsPage.nav' });
  return { title: `${t('integrations')} | Ribot` };
}

/**
 * La pàgina principal d'Integracions.
 */
export default function IntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsSkeleton />}>
      <IntegrationsData />
    </Suspense>
  );
}