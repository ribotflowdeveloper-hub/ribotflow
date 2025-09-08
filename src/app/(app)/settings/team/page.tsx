// src/app/(app)/settings/team/page.tsx

import { TeamClient } from './_components/TeamClient';// En un futur, aquí obtindries les dades de l'equip des del servidor
// import { getTeamMembers } from '@/lib/data/teams';

export default async function TeamPage() {
  // const members = await getTeamMembers();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Gestió de l'Equip</h1>
      <TeamClient /* members={members} */ />
    </div>
  );
}