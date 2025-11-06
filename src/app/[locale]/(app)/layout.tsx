import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppClientLayout } from './_components/AppClientLayout';
import { getUsageLimitStatus } from '@/lib/subscription/subscription';
// ✅ CORRECCIÓ 1: Definim el tipus de les propietats
// indicant que 'params' pot ser una promesa.
interface AppLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * @summary Layout de servidor que embolcalla la part principal de l'aplicació.
 */
export default async function AppLayout(props: AppLayoutProps) {
  // ✅ CORRECCIÓ 2: Fem 'await' per resoldre la promesa i obtenir els paràmetres.
  const { locale } = await props.params;
  const { children } = props;
  
  const aiLimitStatus = await getUsageLimitStatus('maxAIActionsPerMonth');
  // Carreguem els missatges necessaris per als components de client dins d'aquest layout.
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppClientLayout locale={locale} aiLimitStatus={aiLimitStatus}>{children} </AppClientLayout>
    </NextIntlClientProvider>
  );
}