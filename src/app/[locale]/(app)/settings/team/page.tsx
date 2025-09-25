// /app/[locale]/settings/team/page.tsx

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { TeamClient } from "./_components/TeamClient";
// Es mejor tener los tipos en un fichero separado, ej: ./types.ts
export type Team = { id: string; name: string; };
export type TeamMember = { role: string; profiles: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; } | null; };
export type Invitation = { id: string; email: string; role: string; };
export type UserTeam = { role: string; teams: Team | null; };
export type Permission = { grantee_user_id: string; target_user_id: string; };
export type ActiveTeamData = {
    team: Team;
    teamMembers: TeamMember[];
    pendingInvitations: Invitation[];
    currentUserRole: string;
    inboxPermissions: Permission[];
};


export default async function TeamSettingsPage() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const activeTeamId = user.app_metadata?.active_team_id;

    // CASO 1: El usuario no tiene equipo activo (Vista de Lobby)
    if (!activeTeamId) {
        const { data: userTeamsData } = await supabase
            .from('team_members')
            .select('role, teams!inner(id, name)')
            .eq('user_id', user.id);
        
        const userTeams: UserTeam[] = (userTeamsData || []).map(m => ({
            role: m.role,
            teams: Array.isArray(m.teams) ? m.teams[0] : m.teams,
        }));
        
        return <TeamClient user={user} userTeams={userTeams} activeTeamData={null} />;
    }

    // CASO 2: El usuario tiene un equipo activo. Validamos que sigue siendo miembro.
    const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', activeTeamId)
        .single();

    // ✅ ESTE ES EL CAMBIO CLAVE QUE ROMPE EL BUCLE
    if (!member) {
        // El estado es inválido. En lugar de redirigir, renderizamos el cliente con un aviso.
        console.warn(`[SERVER] Estado inválido detectado para ${user.id}. Notificando al cliente para que lo corrija.`);
        return <TeamClient user={user} userTeams={[]} activeTeamData={null} invalidTeamState={true} />;
    }

    // Si el estado es válido, cargamos todos los datos del equipo.
    const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', activeTeamId);
    if (membersError) throw membersError;

    let finalTeamMembers: TeamMember[] = [];
    if (members && members.length > 0) {
        const memberUserIds = members.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', memberUserIds);
        if (profilesError) throw profilesError;
        
        finalTeamMembers = members.map(m => ({
            role: m.role,
            profiles: profiles?.find(p => p.id === m.user_id) || null,
        }));
    }
    
    const [teamRes, invitesRes, permissionsRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('id', activeTeamId).single(),
        supabase.from('invitations').select('id, email, role').eq('team_id', activeTeamId),
        supabase.from('inbox_permissions').select('grantee_user_id, target_user_id').eq('team_id', activeTeamId)
    ]);
    
    const activeTeamData: ActiveTeamData = {
        team: teamRes.data as Team,
        teamMembers: finalTeamMembers,
        pendingInvitations: (invitesRes.data as Invitation[]) || [],
        currentUserRole: member.role,
        inboxPermissions: (permissionsRes.data as Permission[]) || []
    };

    return <TeamClient user={user} userTeams={[]} activeTeamData={activeTeamData} />;
}