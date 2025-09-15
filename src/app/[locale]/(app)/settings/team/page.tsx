// Aquest arxiu és un Server Component. S'executa al servidor.

import { TeamClient } from './_components/TeamClient';

// En un futur, quan la funcionalitat estigui completa, aquí importaries
// les funcions necessàries per carregar les dades de l'equip des de la base de dades.
// import { getTeamMembers } from '@/lib/data/teams';

/**
 * Funció principal de la pàgina del servidor per a la ruta '/settings/team'.
 * La seva responsabilitat serà carregar les dades de l'equip i passar-les
 * al component de client per a la seva visualització.
 */
export default async function TeamPage() {
  // Aquesta seria la línia on carregaries les dades. Està comentada perquè
  // la funcionalitat encara no està implementada.
  // const members = await getTeamMembers();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Gestió de l'Equip</h1>
      {/* Passem les dades carregades (quan existeixin) al component de client. */}
      <TeamClient /* members={members} */ />
    </div>
  );
}