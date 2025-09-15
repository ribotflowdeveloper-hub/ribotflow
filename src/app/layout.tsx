/**
 * @file layout.tsx (Root Layout)
 * @summary Aquest fitxer defineix el layout arrel de TOTA l'aplicació.
 * És un Component de Servidor que embolcalla totes les pàgines. La seva funció és:
 * 1. Definir l'estructura HTML bàsica (<html> i <body>).
 * 2. Carregar estils globals i fonts.
 * 3. Configurar les metadades per defecte per al SEO.
 * 4. Implementar proveïdors de context globals, com el 'ThemeProvider' per al mode clar/fosc.
 */

import './globals.css'; // Estils globals que s'apliquen a tota l'aplicació.
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider'; // Proveïdor per a la gestió del tema (clar/fosc).
import { Toaster } from 'sonner'; // Component per mostrar notificacions (toasts) a tota l'app.
import 'prismjs/themes/prism-tomorrow.css'; // Estils per al ressaltat de sintaxi a l'editor de plantilles.
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elteudomini.com';

// L'objecte 'metadata' de Next.js s'utilitza per generar les etiquetes <head> de la pàgina
// de manera automàtica i optimitzada per al SEO.
export const metadata: Metadata = {
  title: {
    template: '%s | Ribot', // Plantilla per als títols de les pàgines filles.
    default: 'Ribot - El Teu CRM Intel·ligent', // Títol per defecte.
  },
  description: 'Gestiona els teus clients, projectes i factures de manera eficient amb Ribot, el CRM dissenyat per a autònoms i petites empreses.',
  metadataBase: new URL(siteUrl), // URL base per a totes les metadades relatives.
  manifest: '/site.webmanifest', // Fitxer de manifest per a Progressive Web Apps (PWA).
  icons: {
    icon: [ // Diferents mides i formats del favicon.
        { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png', // Icona per a dispositius Apple.
  },
  // Metadades per a Open Graph (Facebook, LinkedIn, etc.).
  openGraph: {
    title: 'Ribot - El Teu CRM Intel·ligent',
    description: 'Simplifica la gestió del teu negoci. Clients, pressupostos i factures en un sol lloc.',
    url: siteUrl,
    siteName: 'Ribot',
    images: [{ url: `${siteUrl}/og-image.jpg`, alt: 'Panell de control de Ribot CRM', width: 1200, height: 630 }],
    locale: 'ca_ES',
    type: 'website',
  },
  // Metadades per a les targetes de Twitter.
  twitter: {
    card: 'summary_large_image',
    title: 'Ribot - El Teu CRM Intel·ligent',
    description: 'Gestiona els teus clients, projectes i factures de manera eficient.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  // Metadades per als robots dels motors de cerca.
  robots: {
    index: true,
    follow: true,
  },
};

// Dades estructurades (JSON-LD) per a l'organització. Ajuda a Google a entendre qui ets.
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Ribot",
  "url": siteUrl,
  "logo": `${siteUrl}/android-chrome-512x512.png`,
  "description": "Ribot és un CRM per a autònoms i pimes que simplifica la gestió de clients i facturació.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 'suppressHydrationWarning' és útil quan es fa servir 'next-themes' per evitar avisos a la consola.
    <html lang="ca" suppressHydrationWarning>
      <body className={inter.className}>
        {/* El ThemeProvider embolcalla tota l'aplicació per gestionar el tema clar/fosc. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children} {/* Aquí és on es renderitzaran totes les pàgines de l'aplicació. */}
        </ThemeProvider>
        {/* El Toaster es col·loca aquí per estar disponible a tota l'aplicació. */}
        <Toaster position="bottom-right" richColors closeButton />
        {/* Incorporem les dades estructurades com un script JSON-LD. */}
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
      </body>
    </html>
  );
}
