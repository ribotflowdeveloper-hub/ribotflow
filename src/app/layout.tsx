// src/app/layout.tsx
import './globals.css'; // <--- AQUESTA LÍNIA ÉS LA MÉS IMPORTANT DE TOTES
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import 'prismjs/themes/prism-tomorrow.css'; // ✅ AFEGEIX AQUESTA LÍNIA
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

// IMPORTANT: Canvia aquesta URL per la de la teva aplicació en producció
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elteudomini.com';

export const metadata: Metadata = {
  title: {
    template: '%s | Ribot',
    default: 'Ribot - El Teu CRM Intel·ligent',
  },
  description: 'Gestiona els teus clients, projectes i factures de manera eficient amb Ribot, el CRM dissenyat per a autònoms i petites empreses.',
  metadataBase: new URL(siteUrl),
  manifest: '/site.webmanifest',
  icons: {
    icon: [
        { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Ribot - El Teu CRM Intel·ligent',
    description: 'Simplifica la gestió del teu negoci. Clients, pressupostos i factures en un sol lloc.',
    url: siteUrl,
    siteName: 'Ribot',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        alt: 'Panell de control de Ribot CRM',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'ca_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ribot - El Teu CRM Intel·ligent',
    description: 'Gestiona els teus clients, projectes i factures de manera eficient.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Ribot",
  "url": siteUrl,
  "logo": `${siteUrl}/android-chrome-512x512.png`,
  "description": "Ribot és un CRM per a autònoms i pimes que simplifica la gestió de clients i facturació.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          
        </ThemeProvider>
        <Toaster position="bottom-right" richColors closeButton />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />

      </body>
    </html>
  );
}