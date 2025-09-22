// /app/settings/team/page.tsx

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { TeamClient } from "./_components/TeamClient";

// Definim els tipus aquí perquè són específics d'aquesta pàgina
export type Team = { id: string; name: string; } | null;
export type TeamMember = { role: string; profiles: { id: string; full_name: string | null; email: string | null; } | null; };
export type Invitation = { id: string; email: string; role: string; };

export default async function TeamSettingsPage() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Busquem si l'usuari és membre d'algun equip
    const { data: member } = await supabase
        .from('team_members')
        .select('teams(id, name)')
        .eq('user_id', user.id)
        .maybeSingle(); // Usar maybeSingle és més segur

    let team: Team = null;
    let teamMembers: TeamMember[] = [];
    let pendingInvitations: Invitation[] = [];

    // Si l'usuari té un equip, busquem les dades addicionals
    if (member && member.teams) {
        team = member.teams as unknown as Team;
        
        const [membersRes, invitesRes] = await Promise.all([
            supabase.from('team_members').select('role, profiles(id, full_name, email)').eq('team_id', team!.id),
            supabase.from('invitations').select('id, email, role').eq('team_id', team!.id)
        ]);

        teamMembers = (membersRes.data as unknown as TeamMember[]) || [];
        pendingInvitations = (invitesRes.data as Invitation[]) || [];
    }
    
    // Passem totes les dades al component de client
    return <TeamClient user={user} team={team} teamMembers={teamMembers} pendingInvitations={pendingInvitations} />;
}