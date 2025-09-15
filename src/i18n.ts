/**
 * @file src/i18n.ts
 * @summary Configuració central per a la internacionalització (i18n).
 */
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['ca', 'es', 'en'] as const;
export const defaultLocale = 'ca';

export default getRequestConfig(async ({ locale }) => {
  // Si `locale` és undefined, utilitzem l'idioma per defecte
  const safeLocale = locale ?? defaultLocale;

  // Validem que l'idioma existeix
  if (!locales.includes(safeLocale as any)) {
    notFound(); // Mostra 404 si no és vàlid
  }

  return {
    locale: safeLocale, // 👈 Ara és sempre string
    messages: (await import(`../language/${safeLocale}.json`)).default,
  };
});