import type { SupabaseClient } from "@supabase/supabase-js";

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
        .select('role, user_id, full_name, email, avatar_url')
        .eq('team_id', teamId);
    
    // Si hi ha un error, 'response.error' tindrà valor.
    // Si no, 'response.data' tindrà valor. Però el format és el mateix.
    return response;
}