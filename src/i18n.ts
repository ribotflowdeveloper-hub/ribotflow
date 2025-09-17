/**
 * @file src/i18n.ts
 * @summary Configuració central per a la internacionalització (i18n).
 */
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['ca', 'es', 'en'] as const;
export const defaultLocale = 'ca';

// Definim un tipus per als nostres idiomes
type Locale = typeof locales[number];

export default getRequestConfig(async ({ locale }) => {
  // Si `locale` és undefined, utilitzem l'idioma per defecte
  const safeLocale = locale || defaultLocale;

  
  // ✅ CORRECCIÓ: Validació segura de tipus sense 'as any'
  if (!locales.includes(safeLocale as Locale)) {
    notFound();
  }

  return {
    locale: safeLocale, // 👈 Ara és sempre string
    messages: (await import(`../language/${safeLocale}.json`)).default,
  };
});