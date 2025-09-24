import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { TeamClient } from "./_components/TeamClient";

// Tipus de dades (sense canvis)
export type Team = { id: string; name: string; };
export type TeamMember = { role: string; profiles: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; } | null; };
export type Invitation = { id: string; email: string; role: string; };
export type UserTeam = { role: string; teams: Team | null; };
export type ActiveTeamData = {
    team: Team;
    teamMembers: TeamMember[];
    pendingInvitations: Invitation[];
    currentUserRole: string;
};

export default async function TeamSettingsPage() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const activeTeamId = user.app_metadata?.active_team_id;

    // --- CAS 1: VISTA DE VESTÍBUL (Això ja funcionava bé, no es toca) ---
 
    // --- CAS 1: VISTA DE VESTÍBUL ---
    if (!activeTeamId) {
        // Aquesta part funciona, la deixem com estava.
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
    // --- CAS 2: VISTA DE PANELL DE CONTROL (AQUÍ APLIQUEM LA SOLUCIÓ) ---
    const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
    if (!member) {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { active_team_id: null } });
        return redirect('/settings/team');
    }

    // PAS A: Obtenim la llista de membres (només ID i rol) des de 'team_members'.
    // Aquesta és una consulta simple i segura.
    const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', activeTeamId);

    if (membersError) throw membersError;

    let teamMembers: TeamMember[] = [];

    if (members && members.length > 0) {
        // PAS B: Obtenim els IDs de tots els membres de l'equip.
        const memberUserIds = members.map(m => m.user_id);

        // PAS C: Busquem tots els perfils d'aquests membres en una sola consulta a 'profiles'.
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', memberUserIds);

        if (profilesError) throw profilesError;
        
        // PAS D: Unim manualment les dues llistes al nostre codi.
        teamMembers = members.map(member => ({
            role: member.role,
            profiles: profiles?.find(p => p.id === member.user_id) || null,
        }));
    }
    
    // La resta de consultes per al nom de l'equip i les invitacions es queden igual.
    const [teamRes, invitesRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('id', activeTeamId).single(),
        supabase.from('invitations').select('id, email, role').eq('team_id', activeTeamId)
    ]);

    const activeTeamData: ActiveTeamData = {
        team: teamRes.data as Team,
        teamMembers: teamMembers, // Ara conté les dades unides
        pendingInvitations: (invitesRes.data as Invitation[]) || [],
        currentUserRole: member.role
    };

    return <TeamClient user={user} userTeams={[]} activeTeamData={activeTeamData} />;
}