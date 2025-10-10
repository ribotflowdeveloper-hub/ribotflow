import { createClient } from "@/lib/supabase/server";
import { TeamHub } from "./TeamHub";
import type { UserTeam } from '../page'; // Importem els tipus de la pàgina

interface TeamSelectorDataProps {
  userId: string;
}

export async function TeamSelectorData({ userId }: TeamSelectorDataProps) {
    const supabase = createClient();

    // Movem aquí la lògica de càrrega de dades per a la selecció
    const [userTeamsRes, invitationsRes] = await Promise.all([
        supabase.from('team_members').select('role, teams!inner(id, name)').eq('user_id', userId),
        supabase.from('invitations').select('id, team_name, inviter_name').eq('user_id', userId).eq('status', 'pending')
    ]);

    if (userTeamsRes.error || invitationsRes.error) {
        // Aquí podríem mostrar un missatge d'error més elegant
        console.error("Error loading team selection data:", { teamError: userTeamsRes.error, invError: invitationsRes.error });
        return <div>Error en carregar les dades de l'equip.</div>;
    }

    const userTeams: UserTeam[] = (userTeamsRes.data || []).filter(Boolean).map(m => ({
        role: m.role,
        teams: Array.isArray(m.teams) ? m.teams[0] : m.teams
    }));

    return (
        <TeamHub 
            userTeams={userTeams} 
            personalInvitations={invitationsRes.data || []} 
        />
    );
}