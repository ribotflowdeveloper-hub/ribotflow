// /src/app/[locale]/(app)/settings/team/_components/TeamData.tsx (VERSIÓ AMB VISTA)

import { createClient } from "@/lib/supabase/server";
import { TeamDashboard } from "./TeamDashboard";
import type { User } from "@supabase/supabase-js";
import type { ActiveTeamData, Team, Invitation, TeamMember } from "../page";

interface TeamDataProps {
    user: User;
    member: { role: string };
    activeTeamId: string;
}

export async function TeamData({ user, member, activeTeamId }: TeamDataProps) {
    const supabase = createClient();

    // La consulta dels membres ara és molt més senzilla i directa.
    const [teamRes, invitesRes, permissionsRes, membersRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('id', activeTeamId).single(),
        supabase.from('invitations').select('id, email, role').eq('team_id', activeTeamId).eq('status', 'pending'),
        supabase.from('inbox_permissions').select('grantee_user_id, target_user_id').eq('team_id', activeTeamId),
        // ✅ CANVI CLAU: Consultem directament a la VISTA!
        supabase.from('team_members_with_profiles').select('*').eq('team_id', activeTeamId)
    ]);

    // La transformació de dades també es simplifica, ja que la vista retorna un format pla.
    const finalTeamMembers: TeamMember[] = (membersRes.data || []).map(m => ({
        role: m.role ?? "", // Ensure role is always a string
        profiles: m.user_id ? { // Només creem el perfil si hi ha dades
            id: m.user_id,
            full_name: m.full_name,
            email: m.email,
            avatar_url: m.avatar_url,
        } : null,
    }));

    const activeTeamData: ActiveTeamData = {
        team: teamRes.data as Team,
        teamMembers: finalTeamMembers,
        pendingInvitations: (invitesRes.data as Invitation[]) || [],
        currentUserRole: member.role,
        inboxPermissions: permissionsRes.data || []
    };

    // DEPURACIÓ: Aquest log ara hauria de mostrar les dades correctes.
    console.log("===================================");
    console.log("DADES FINALS (des de la VISTA):");
    console.log(JSON.stringify(activeTeamData.teamMembers, null, 2));
    console.log("===================================");

    return <TeamDashboard user={user} activeTeamData={activeTeamData} />;
}