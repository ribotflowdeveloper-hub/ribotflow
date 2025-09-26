import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { IntegrationsData } from './_components/IntegrationsData';
import { IntegrationsSkeleton } from './_components/IntegrationsSkeleton';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('SettingsPage.integrations');
    return { title: t('pageTitle') };
}

export default function IntegrationsPage() {
    return (
        <Suspense fallback={<IntegrationsSkeleton />}>
            <IntegrationsData />
        </Suspense>
    );
}