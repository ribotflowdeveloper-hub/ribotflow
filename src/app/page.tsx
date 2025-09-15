/**
 * @file src/app/page.tsx (Root Redirect Page)
 * @summary Aquesta pàgina no mostra contingut. La seva única funció
 * és redirigir l'usuari a la ruta de l'idioma per defecte.
 */
import { redirect } from 'next/navigation';
import { defaultLocale } from '@/../src/i18n'; // Importem l'idioma per defecte

export default function RootPage() {
  // Redirigim a la pàgina d'inici amb l'idioma per defecte.
  // El middleware ja fa això, però aquesta és una bona pràctica
  // com a fallback.
  redirect(`/${defaultLocale}`);
}