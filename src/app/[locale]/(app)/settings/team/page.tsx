import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { TeamClient } from "./_components/TeamClient";

export type Team = { id: string; name: string; } | null;
export type TeamMember = { role: string; profiles: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; } | null; };
export type Invitation = { id: string; email: string; role: string; };

export default async function TeamSettingsPage() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    console.log("--- PAS 1: BUSCANT EQUIP PER A L'USUARI ---");
    console.log("ID de l'usuari actual:", user.id);

    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

    if (memberError) {
        console.error("!!! ERROR en buscar el membre de l'equip:", memberError);
    }

    if (!member || !member.team_id) {
        console.log("Resultat: L'usuari no pertany a cap equip. Mostrant formulari de creació.");
        return <TeamClient user={user} team={null} teamMembers={[]} pendingInvitations={[]} currentUserRole={null} />;
    }

    const teamId = member.team_id;
    const currentUserRole = member.role;
    console.log("--- PAS 2: EQUIP TROBAT ---");
    console.log("ID de l'equip trobat:", teamId);
    console.log("Rol de l'usuari actual:", currentUserRole);

    console.log("\n--- PAS 3: BUSCANT TOTS ELS MEMBRES DE L'EQUIP ---");
    // Separem la consulta per poder depurar-la millor
    const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('role, profiles!left(id, full_name, email, avatar_url)')
        .eq('team_id', teamId);

    console.log("Resultat de la consulta de membres (raw):");
    console.log("Dades rebudes:", JSON.stringify(membersData, null, 2));
    if (membersError) {
        console.error("!!! ERROR en buscar els membres:", membersError);
    } else {
        console.log(`Consulta finalitzada. S'han trobat ${membersData?.length ?? 0} registres.`);
    }
    console.log("------------------------------------------");

    // La resta de la càrrega de dades
    const [teamRes, invitesRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('id', teamId).single(),
        supabase.from('invitations').select('id, email, role').eq('team_id', teamId)
    ]);

    const team: Team = teamRes.data;
    // Assegurem que el tipat sigui correcte
    const teamMembers: TeamMember[] = (membersData as never) || []; 
    const pendingInvitations: Invitation[] = (invitesRes.data as Invitation[]) || [];

    return <TeamClient 
        user={user} 
        team={team} 
        teamMembers={teamMembers} 
        pendingInvitations={pendingInvitations} 
        currentUserRole={currentUserRole}
    />;
}
