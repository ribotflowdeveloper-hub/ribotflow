// Aquest és un Server Component que gestiona la ruta arrel '/settings'.

import { redirect } from 'next/navigation';

/**
 * Aquesta pàgina no té contingut visual propi.
 * La seva única funció és redirigir l'usuari automàticament
 * a la primera secció de la configuració, que és el perfil.
 * Això millora l'experiència d'usuari, evitant que arribi a una pàgina '/settings' buida.
 */
export default function SettingsRootPage() {
  // 'redirect' és una funció de Next.js que envia l'usuari a una altra URL.
  redirect('/settings/profile');
}