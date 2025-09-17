// src/app/[locale]/layout.tsx
import '../globals.css';
import 'prismjs/themes/prism-tomorrow.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  // ✅ Desestructurem dins del cos
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ribotflow.com';

  return {
    title: { template: `%s | ${t('siteName')}`, default: t('defaultTitle') },
    description: t('description'),
    metadataBase: new URL(siteUrl),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // ✅ Esperem params abans d'accedir-hi
  const { locale } = await params;

  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>

     
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
