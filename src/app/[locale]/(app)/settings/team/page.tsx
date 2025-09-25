import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { TeamClient } from "./_components/TeamClient";

// Tipus de dades (sense canvis)
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

    // --- CAS 1: VISTA DE VESTÍBUL ---
    if (!activeTeamId) {
        // ... (Aquesta part ja era correcta, no la toquem)
    }

    // --- CAS 2: VISTA DE PANELL DE CONTROL ---
    const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
    if (!member) {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { active_team_id: null } });
        return redirect('/settings/team');
    }

    // ✅ CORRECCIÓ: Hem unificat tota la càrrega de dades aquí.

    // Primer, obtenim la llista de membres amb el mètode manual segur.
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
        
        finalTeamMembers = members.map(member => ({
            role: member.role,
            profiles: profiles?.find(p => p.id === member.user_id) || null,
        }));
    }

    // Després, obtenim la resta de dades que necessitem en paral·lel.
    const [teamRes, invitesRes, permissionsRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('id', activeTeamId).single(),
        supabase.from('invitations').select('id, email, role').eq('team_id', activeTeamId),
        supabase.from('inbox_permissions').select('grantee_user_id, target_user_id').eq('team_id', activeTeamId)
    ]);
    
    const activeTeamData: ActiveTeamData = {
        team: teamRes.data as Team,
        teamMembers: finalTeamMembers, // Utilitzem la variable correcta
        pendingInvitations: (invitesRes.data as Invitation[]) || [],
        currentUserRole: member.role,
        inboxPermissions: (permissionsRes.data as Permission[]) || []
    };

    return <TeamClient user={user} userTeams={[]} activeTeamData={activeTeamData} />;
}