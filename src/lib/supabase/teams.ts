import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server"; // Importem el server client

// Definim el tipus de retorn esperat per a tenir un codi ben tipat
export type TeamMemberWithProfile = {
    role: string;
    profiles: {
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
    } | null;
};

/**
 * Funció reutilitzable que obté tots els membres d'un equip juntament amb
 * les dades dels seus perfils. Encapsula la lògica del "join manual".
 * @param supabase - La instància del client de Supabase.
 * @param teamId - L'ID de l'equip del qual volem obtenir els membres.
 * @returns Una promesa que resol a una llista de membres amb els seus perfils.
 */
// Aquesta funció es torna molt més simple i ràpida
export async function getTeamMembersWithProfiles(
    supabase: SupabaseClient,
    teamId: string
) {
    // La funció només ha de fer la consulta i retornar la resposta.
    // Aquesta resposta SEMPRE serà un objecte amb format { data, error }.
    const response = await supabase
        .from('team_members_with_profiles')
        .select('*')
        .eq('team_id', teamId);

    // Si hi ha un error, 'response.error' tindrà valor.
    // Si no, 'response.data' tindrà valor. Però el format és el mateix.
    return response;
}

// 👇 AFEGEIX AQUESTA NOVA FUNCIÓ 👇

/**
 * Obté les dades completes de l'equip actiu d'un usuari des d'un Server Component.
 * Primer busca l'ID de l'equip actiu al perfil de l'usuari i després
 * recupera les dades de la taula 'teams'.
 * @param userId L'ID de l'usuari autenticat.
 * @returns Una promesa que resol a les dades de l'equip o null si no en té cap d'actiu.
 */
export async function getActiveTeam(userId: string) {
  // Creem un client de Supabase específic per a operacions de servidor
  const supabase = createClient();

  // 1. Obtenim l'ID de l'equip actiu des del perfil de l'usuari
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('active_team_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile || !profile.active_team_id) {
    console.error("Error en obtenir l'ID de l'equip actiu del perfil:", profileError?.message);
    return null;
  }

  const activeTeamId = profile.active_team_id;

  // 2. Amb l'ID, obtenim les dades completes de l'equip
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', activeTeamId)
    .single();

  if (teamError) {
    console.error("Error en obtenir les dades de l'equip actiu:", teamError.message);
    return null;
  }

  return team;
}