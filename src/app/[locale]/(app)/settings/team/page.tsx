/**
 * @file page.tsx (Gestió d'Equip)
 * @summary Component de Servidor per a la pàgina de gestió d'equip.
 */

import { TeamClient } from './_components/TeamClient';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

/**
 * @summary Genera les metadades de la pàgina de manera dinàmica i traduïda.
 */
// ✅ CORRECCIÓ: Hem eliminat 'params'. La funció ja no els necessita.
export async function generateMetadata(): Promise<Metadata> {
  // ✅ La funció 'getTranslations' sap quin idioma carregar automàticament.
  const tNav = await getTranslations('SettingsPage.nav');
  return { title: `${tNav('team')} | Ribot` };
}

/**
 * @function TeamPage
 * @summary Carrega les traduccions i renderitza el component de client.
 */
export default async function TeamPage() {
  const t = await getTranslations('SettingsPage.SettingsTeam');

  // En un futur, aquí carregaries les dades de l'equip.
  // const members = await getTeamMembers();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t('pageTitle')}</h1>
      <TeamClient /* members={members} */ />
    </div>
  );
}