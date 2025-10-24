import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database} from '@/types/supabase';
import type { SocialPost } from "@/types/comunicacio/SocialPost"; // Assegura't que la ruta és correcta
export { type SocialPost } from "@/types/comunicacio/SocialPost"; // Re-exportem per a ús extern
// Tipus per a l'estat de connexió
export type ConnectionStatuses = {
    linkedin: boolean;
    facebook: boolean;
    instagram: boolean;
};

// Tipus de retorn del servei
export type SocialPlannerInitialData = {
    posts: SocialPost[];
    connectionStatuses: ConnectionStatuses;
};

// Tipus d'error detallat
export type SocialPlannerDataError = {
    postsError?: PostgrestError | null;
    userCredsError?: PostgrestError | null;
    teamCredsError?: PostgrestError | null;
};

/**
 * Obté les dades inicials per al Planificador Social.
 *
 * @param supabase Client Supabase autenticat.
 * @param userId ID de l'usuari actual.
 * @param teamId ID de l'equip actiu.
 * @returns Objecte amb les dades inicials o un error detallat.
 */
export async function getSocialPlannerInitialData(
    supabase: SupabaseClient<Database>,
    userId: string,
    teamId: string
): Promise<{ data: SocialPlannerInitialData | null; error: SocialPlannerDataError | null }> {

    const [postsRes, userCredsRes, teamCredsRes] = await Promise.all([
        supabase
            .from('social_posts')
            .select('*')
            .eq('team_id', teamId) // RLS hauria de fer el mateix, però és bona pràctica ser explícit
            .order('created_at', { ascending: false }),
        supabase.from('user_credentials').select('provider').eq('user_id', userId),
        supabase.from('team_credentials').select('provider').eq('team_id', teamId)
    ]);

    // Comprovar errors
    const errors: SocialPlannerDataError = {};
    if (postsRes.error) errors.postsError = postsRes.error;
    if (userCredsRes.error) errors.userCredsError = userCredsRes.error;
    if (teamCredsRes.error) errors.teamCredsError = teamCredsRes.error;

    if (Object.keys(errors).length > 0) {
        console.error("Error(s) a getSocialPlannerInitialData (service):", errors);
        return { data: null, error: errors };
    }

    // Processar dades
    const posts = (postsRes.data as SocialPost[]) || [];

    const userProviders = userCredsRes.data?.map(c => c.provider) || [];
    const teamProviders = teamCredsRes.data?.map(c => c.provider) || [];
    const allConnectedProviders = new Set([...userProviders, ...teamProviders]);

    const connectionStatuses: ConnectionStatuses = {
        linkedin: allConnectedProviders.has('linkedin'),
        facebook: allConnectedProviders.has('facebook'),
        instagram: allConnectedProviders.has('instagram'),
    };

    const data: SocialPlannerInitialData = {
        posts,
        connectionStatuses
    };

    return { data, error: null };
}