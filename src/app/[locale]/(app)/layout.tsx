/**
 * @file src/app/[locale]/(app)/layout.tsx
 * @summary Layout de servidor que carrega dades i embolcalla el layout de client.
 */
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppClientLayout } from './_components/AppClientLayout';

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export default async function AppLayout({ children, params }: Props) {
  // ✅ Primer esperem que Next.js resolgui params
  const { locale } = await params;

  // ✅ Ara carreguem els missatges
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppClientLayout locale={locale}>{children}</AppClientLayout>
    </NextIntlClientProvider>
  );
}
