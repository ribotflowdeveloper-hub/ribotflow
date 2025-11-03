// src/lib/services/comunicacio/socialPlanner.service.ts

import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database} from '@/types/supabase';

// ✅ CANVI: Importem el tipus des de la nostra font de la veritat
import type { SocialPost } from "@/types/db";
export type { SocialPost }; // Re-exportem per a ús extern (com al SocialPlannerData)

// Definim el nom del bucket centralitzat
const bucketName = 'assets-publics';

// --- Tipus de Dades del Servei ---

export type ConnectionStatuses = {
    linkedin: boolean;
    facebook: boolean;
    instagram: boolean;
};

export type SocialPlannerInitialData = {
    posts: SocialPost[];
    connectionStatuses: ConnectionStatuses;
};

export type SocialPlannerDataError = {
    postsError?: PostgrestError | null;
    userCredsError?: PostgrestError | null;
    teamCredsError?: PostgrestError | null;
};

type ServerSupabaseClient = SupabaseClient<Database>;


// --- Funcions de LECTURA (Ja la tenies) ---

/**
 * Obté les dades inicials per al Planificador Social.
 */
export async function getSocialPlannerInitialData(
    supabase: ServerSupabaseClient,
    userId: string,
    teamId: string
): Promise<{ data: SocialPlannerInitialData | null; error: SocialPlannerDataError | null }> {

    const [postsRes, userCredsRes, teamCredsRes] = await Promise.all([
        supabase
            .from('social_posts')
            .select('*')
            .eq('team_id', teamId)
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

// ---
// ⚙️ NOVES Funcions de SERVEI (Escriptura)
// ---

/**
 * SERVEI: Crea URLs de pujada signades.
 * Llança un error si falla.
 */
export async function getPresignedUploadUrls(
    supabase: ServerSupabaseClient,
    fileNames: string[],
    userId: string,
    activeTeamId: string
): Promise<{ signedUrls: { signedUrl: string; path: string; }[] }> {
    const signedUrls = await Promise.all(
        fileNames.map(async (fileName) => {
            const fileExt = fileName.split('.').pop();
            // Estructura: 'social_media/[team_id]/[user_id]-[timestamp].[ext]'
            const filePath = `social_media/${activeTeamId}/${userId}-${Date.now()}-${Math.random()}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from(bucketName)
                .createSignedUploadUrl(filePath);

            if (error) {
                console.error("Error RLS en crear Signed URL (service):", error.message);
                throw new Error(`Error creant URL per a ${fileName}: ${error.message}`);
            }
            
            return { signedUrl: data.signedUrl, path: data.path };
        })
    );
    return { signedUrls };
}

/**
 * SERVEI: Crea un registre de publicació en esborrany.
 * Llança un error si falla.
 */
export async function createSocialPost(
    supabase: ServerSupabaseClient,
    content: string,
    providers: string[],
    mediaPaths: string[] | null,
    mediaType: string | null,
    userId: string,
    activeTeamId: string
): Promise<SocialPost> {
    let media_urls: string[] | null = null;
    if (mediaPaths && mediaPaths.length > 0) {
        media_urls = mediaPaths.map(path =>
            supabase.storage.from(bucketName).getPublicUrl(path).data.publicUrl
        );
    }

    const { data: postData, error: postError } = await supabase
        .from('social_posts') 
        .insert({
            user_id: userId,
            team_id: activeTeamId,
            provider: providers,
            content: content,
            media_url: media_urls as string[], // Supabase espera jsonb, 'string[]' és el tipus correcte aquí
            media_type: mediaType,
            status: 'draft',
        })
        .select()
        .single();

    if (postError) {
        console.error("Error creant la publicació (service):", postError);
        throw new Error("Error en la base de dades al crear la publicació.");
    }
    
    return postData;
}

/**
 * SERVEI: Planifica una publicació.
 * Llança un error si falla.
 */
export async function scheduleSocialPost(
    supabase: ServerSupabaseClient,
    postId: number,
    scheduledAt: string
): Promise<void> {
    const { error } = await supabase
        .from('social_posts')
        .update({ status: 'scheduled', scheduled_at: scheduledAt })
        .eq('id', postId);

    if (error) {
        console.error("Error planificant la publicació (service):", error);
        throw new Error("No s'ha pogut planificar la publicació.");
    }
}

/**
 * SERVEI: Retorna una publicació a l'estat d'esborrany.
 * Llança un error si falla.
 */
export async function unscheduleSocialPost(
    supabase: ServerSupabaseClient,
    postId: number
): Promise<void> {
    const { error } = await supabase
        .from('social_posts')
        .update({ status: 'draft', scheduled_at: null })
        .eq('id', postId);

    if (error) {
        console.error("Error desplanificant la publicació (service):", error);
        throw new Error("No s'ha pogut desplanificar la publicació.");
    }
}

/**
 * SERVEI: Elimina una publicació social i els seus fitxers d'storage.
 * Llança un error si falla.
 */
export async function deleteSocialPost(
    supabase: ServerSupabaseClient,
    postId: number
): Promise<void> {
    // 1. Obtenir els paths dels fitxers
    const { data: post } = await supabase
        .from('social_posts')
        .select('media_url')
        .eq('id', postId)
        .single();

    // 2. Eliminar fitxers d'Storage (si n'hi ha)
    if (post && Array.isArray(post.media_url)) {
        try {
            const pathsToRemove = post.media_url.map((url: string) => {
                const pathname = new URL(url).pathname;
                const pathParts = pathname.split(`/${bucketName}/`);
                return pathParts[1];
            }).filter(Boolean) as string[];

            if (pathsToRemove.length > 0) {
                await supabase.storage.from(bucketName).remove(pathsToRemove);
            }
        } catch (e) {
            console.error("Error en eliminar de Storage (service):", e);
            // No aturem l'esborrat de la BD si falla l'esborrat del fitxer
        }
    }

    // 3. Eliminar la publicació de la BD
    const { error: deleteError } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

    if (deleteError) {
        console.error("Error eliminant la publicació (service):", deleteError);
        throw new Error("No s'ha pogut eliminar la publicació de la base de dades.");
    }
}

// ❌ ELIMINADA: La definició manual 'interface SocialPost' s'ha esborrat.
// Ara utilitzem la que ve de 'db.ts'.