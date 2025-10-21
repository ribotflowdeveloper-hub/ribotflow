import { createClient } from "@/lib/supabase/server";
import { TeamHub } from "./TeamHub";
// ✅ 1. Importem els dos tipus per a més claredat.
import type { UserTeam, PersonalInvitation } from '../page';

interface TeamSelectorDataProps {
  userId: string;
}

export async function TeamSelectorData({ userId }: TeamSelectorDataProps) {
    const supabase = createClient();

    const [userTeamsRes, invitationsRes] = await Promise.all([
        supabase.from('team_members').select('role, teams!inner(id, name)').eq('user_id', userId),
        supabase.from('invitations').select('id, team_name, inviter_name').eq('user_id', userId).eq('status', 'pending')
    ]);

    if (userTeamsRes.error || invitationsRes.error) {
        console.error("Error loading team selection data:", { teamError: userTeamsRes.error, invError: invitationsRes.error });
        return <div>Error en carregar les dades de l'equip.</div>;
    }

    const userTeams: UserTeam[] = (userTeamsRes.data || []).filter(Boolean).map(m => ({
        role: m.role,
        // Aquesta lògica per a 'teams' sembla correcta per gestionar relacions
        teams: Array.isArray(m.teams) ? m.teams[0] : m.teams
    }));

    // ✅ 2. Filtrem i transformem les invitacions per assegurar que compleixen el tipus.
    const personalInvitations: PersonalInvitation[] = (invitationsRes.data || [])
        .filter((invite): invite is PersonalInvitation => 
            !!invite.team_name && !!invite.inviter_name
        );

    return (
        <TeamHub 
            userTeams={userTeams} 
            // ✅ 3. Passem l'array ja filtrat i correctament tipat.
            personalInvitations={personalInvitations} 
        />
    );
}