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


/**
 * Obté les dades completes de l'equip actiu d'un usuari des d'un Server Component.
 * Aquesta versió és robusta i soluciona la 'race condition' del registre.
 *
 * ESTRATÈGIA:
 * 1. (FONT PRIMÀRIA) Intenta obtenir l'ID de l'equip des del token de l'usuari (app_metadata).
 * Això és instantani i fiable després de l'autenticació.
 * 2. (FALLBACK) Si no existeix al token, el busca a la taula de perfils.
 * Això garanteix compatibilitat amb usuaris antics.
 *
 * @returns Una promesa que resol a les dades de l'equip o null si no se'n troba cap.
 */
export async function getActiveTeam() {
  // ✅ CORRECCIÓ: Cridem a la funció sense passar-li el tipus. Ja el porta per defecte.
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  let activeTeamId: string | null | undefined = user.app_metadata?.active_team_id;

  // Fallback...
  if (!activeTeamId) {
    console.warn("active_team_id no trobat a app_metadata. Fent fallback a la taula de perfils.");
    // Ara 'supabase.from('profiles')' tindrà autocompletat i seguretat de tipus!
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_team_id')
      .eq('id', user.id)
      .single();
    
    activeTeamId = profile?.active_team_id;
  }

  // Si després de tot no tenim un ID, no podem continuar
   if (!activeTeamId) {
    console.error("No s'ha pogut determinar l'equip actiu ni des del token ni des del perfil.");
    return null;
  }

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