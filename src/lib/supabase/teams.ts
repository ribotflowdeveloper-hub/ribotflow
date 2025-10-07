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
) { // El tipus de retorn el pot inferir TypeScript
    const { data, error } = await supabase
        .from('team_members_with_profiles') // Consultem la nova vista!
        .select('role, user_id, full_name, email, avatar_url')
        .eq('team_id', teamId);

    if (error) {
        console.error("Error en obtenir membres de l'equip:", error);
        return [];
    }

    // La dada ja ve formatada com la necessites
    return { data, error: null }; // Retornem un objecte consistent
}