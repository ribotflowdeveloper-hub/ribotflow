import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppClientLayout } from './_components/AppClientLayout';
import { getUsageLimitStatus, type UsageCheckResult } from '@/lib/subscription/subscription';

interface AppLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppLayout(props: AppLayoutProps) {
  const { locale } = await props.params;
  const { children } = props;

  // Obtenim l'estat dels límits AI
  const aiLimitStatus: UsageCheckResult | undefined = await getUsageLimitStatus('maxAIActionsPerMonth');

  // ✅ Fallback compatible amb UsageCheckResult
  const safeAiLimitStatus: UsageCheckResult = aiLimitStatus ?? { allowed: false, current: 0, max: 0 };

  // Carreguem missatges per a internacionalització
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppClientLayout locale={locale} aiLimitStatus={safeAiLimitStatus}>
        {children}
      </AppClientLayout>
    </NextIntlClientProvider>
  );
}
