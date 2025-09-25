// /app/[locale]/settings/profile/_components/ProfileData.tsx

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";
import type { Profile, Team } from "@/types/settings";

export async function ProfileData() {
    console.log("\n--- [SERVER] INICI ProfileData ---");
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    console.log(`[SERVER] Usuari autenticat: ${user.id}`);

    // --- NOVA LÒGICA D'EQUIP ACTIU ---
    // 1. Obtenim l'ID de l'equip actiu directament del token de l'usuari.
    const activeTeamId = user.app_metadata?.active_team_id;
    console.log(`[SERVER] Equip actiu llegit del token: ${activeTeamId || 'Cap'}`);
    // ------------------------------------

    // 2. Busquem el perfil PERSONAL de l'usuari. Això sempre es fa.
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    // Inicialitzem les variables d'equip com a null.
    let team: Team | null = null;
    let role: string | null = null;

    // 3. SI I NOMÉS SI hi ha un equip actiu, busquem les seves dades i el rol de l'usuari.
    if (activeTeamId) {
        // Aquesta consulta ara és segura i correcta. Busca la relació per a l'equip actiu.
        const { data: member } = await supabase
            .from('team_members')
            .select('role, teams(*)') // Demanem el rol i TOTES les dades de l'equip relacionat.
            .eq('user_id', user.id)
            .eq('team_id', activeTeamId)
            .single(); // Ara sí podem fer .single(), perquè només hi ha una fila per usuari/equip.

        if (member) {
            role = member.role;
            team = member.teams as unknown as Team || null; // 'teams' és el nom que Supabase li dona a la relació
        } else {
            console.warn(`[SERVER] AVÍS: L'usuari té un active_team_id (${activeTeamId}) però no s'ha trobat la seva pertinença a la taula team_members.`);
        }
    }

    // Aquest console.log ara hauria de mostrar les dades correctes.
    console.log("--- DADES CARREGADES AL SERVIDOR (PERFIL) ---");
    console.log("Rol de l'usuari detectat:", role);
    console.log("Dades de l'equip actiu:", team ? `${team.name} (ID: ${team.id})` : null);
    console.log("---------------------------------------------");
    type TeamRole = 'owner' | 'admin' | 'member' | null;

    // 4. Passem les dades per separat al formulari del client.
    return (
        <ProfileForm 
            email={user.email || ''}
            profile={profile as Profile} 
            team={team}
            role={role as TeamRole}        />
    );
}