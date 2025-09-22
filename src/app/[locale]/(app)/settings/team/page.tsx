import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { TeamClient } from "./_components/TeamClient";

export type Team = { id: string; name: string; } | null;
export type TeamMember = { role: string; profiles: { id: string; full_name: string | null; email: string | null; } | null; };
export type Invitation = { id: string; email: string; role: string; };

export default async function TeamSettingsPage() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: member } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!member || !member.team_id) {
        return <TeamClient user={user} team={null} teamMembers={[]} pendingInvitations={[]} />;
    }

    const teamId = member.team_id;

    const [teamRes, membersRes, invitesRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('id', teamId).single(),
        // ✅ Canvi: 'profiles!left(...)' fa un LEFT JOIN.
        supabase.from('team_members').select('role, profiles!left(id, full_name, email)').eq('team_id', teamId),
        supabase.from('invitations').select('id, email, role').eq('team_id', teamId)
    ]);

    if (teamRes.error) {
        console.error("Error en carregar l'equip:", teamRes.error);
        return <TeamClient user={user} team={null} teamMembers={[]} pendingInvitations={[]} />;
    }

    const team: Team = teamRes.data;
    const teamMembers: TeamMember[] = (membersRes.data as unknown as TeamMember[]) || [];
    const pendingInvitations: Invitation[] = (invitesRes.data as Invitation[]) || [];

    // ✅ TRAMPA DE DEPURACIÓ 1: MIREM QUÈ ARRIBA DEL SERVIDOR
    console.log("\n--- DADES DEL SERVIDOR (page.tsx) ---");
    console.log("Membres de l'equip rebuts de Supabase:", JSON.stringify(teamMembers, null, 2));
    console.log(`S'han trobat ${teamMembers.length} membres.`);
    console.log("------------------------------------\n");

    return <TeamClient user={user} team={team} teamMembers={teamMembers} pendingInvitations={pendingInvitations} />;
}