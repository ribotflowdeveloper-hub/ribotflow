// /src/app/[locale]/(app)/settings/team/_components/ActiveTeamManagerData.tsx

import { createClient } from "@/lib/supabase/server";
import { TeamData } from "./TeamData"; // Component que ara carrega les dades
import { TeamStateCorrector } from "./TeamStateCorrector";
import type { User } from '@supabase/supabase-js';
// Ja no necessitem importar els altres tipus aquí

interface ActiveTeamManagerDataProps {
  user: User;
  activeTeamId: string;
}

export async function ActiveTeamManagerData({ user, activeTeamId }: ActiveTeamManagerDataProps) {
    const supabase = createClient();

    // 1. L'única feina d'aquest component és verificar si l'usuari és membre.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .match({ user_id: user.id, team_id: activeTeamId })
        .single();

    if (!member || memberError) {
        return <TeamStateCorrector />;
    }

    // 2. ✅ CORRECCIÓ CLAU: Ara només passem les props que 'TeamData' realment espera.
    // Deleguem tota la càrrega de dades a 'TeamData'.
    return (
        <TeamData
            user={user}
            member={member}
            activeTeamId={activeTeamId}
        />
    );
}