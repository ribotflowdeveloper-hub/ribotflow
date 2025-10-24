// A /lib/supabase/teams.ts (o on sigui que visqui getActiveTeam)
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

type Team = Database['public']['Tables']['teams']['Row'];

/**
 * Obté les dades d'un equip específic pel seu ID.
 * @param supabase El client de Supabase.
 * @param teamId L'ID de l'equip a obtenir.
 * @returns Les dades de l'equip o null si no es troba o hi ha error.
 */
export async function getActiveTeam(
    supabase: SupabaseClient<Database>, 
    teamId: string
): Promise<Team | null> {
    
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

    if (teamError) {
        console.error("Error en obtenir les dades de l'equip:", teamError.message);
        return null;
    }

    return team;
}

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