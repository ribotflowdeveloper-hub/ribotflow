/**
 * @file src/app/[locale]/page.tsx
 * @summary Aquesta és la pàgina arrel per a un idioma (ex: /ca).
 * El middleware ja ha verificat l'autenticació. La única feina d'aquesta pàgina
 * és redirigir l'usuari cap a la pàgina principal de l'aplicació.
 */
import { redirect } from 'next/navigation';

export default function LocaleRootPage() {
  // Simplement redirigim al dashboard. El middleware ja ha fet la feina de seguretat.
  redirect('/dashboard');
}