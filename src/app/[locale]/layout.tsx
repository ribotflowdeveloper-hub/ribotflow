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

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ribotflow.com';

  return {
    title: { template: `%s | ${t('siteName')}`, default: t('defaultTitle') },
    description: t('description'),
    metadataBase: new URL(siteUrl),
    
    // ✅ NOU: Afegim la configuració per a les icones i el manifest.
    // Next.js buscarà automàticament aquests fitxers a la carpeta /app.
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-icon.png',
    },
    manifest: '/site.webmanifest',
  };
}

export default async function LocaleLayout(props: LocaleLayoutProps) {
  const { locale } = await props.params;
  const { children } = props;

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
