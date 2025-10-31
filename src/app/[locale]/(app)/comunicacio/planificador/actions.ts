"use server";

import { revalidatePath } from "next/cache";
import type { SocialPost } from "@/types/comunicacio/SocialPost";
import { getTranslations } from "next-intl/server";
import { validateSessionAndPermission, PERMISSIONS } from "@/lib/permissions/permissions";
import { type ActionResult } from "@/types/shared/index";


// Definim el nom del bucket centralitzat
const bucketName = 'assets-publics'; 

/**
 * Funció d'ajuda interna per a validar la sessió i els permisos.
 */
async function validateSocialPlannerPermissions() {
    const validationResult = await validateSessionAndPermission(PERMISSIONS.MANAGE_INTEGRATIONS);

    if ('error' in validationResult) {
        const t = await getTranslations('Errors');
        return { error: t('permissionDenied') };
    }
    return validationResult;
}
// ----------------------------------------------------------------------------------

/**
 * Crea una URL de pujada signada (presigned URL) a Supabase Storage.
 */
export async function getPresignedUploadUrlAction(fileNames: string[]): Promise<ActionResult<{ signedUrls: { signedUrl: string; path: string; }[] }>> {
    
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) {
        return { success: false, message: validation.error };
    }
    const { supabase, user, activeTeamId } = validation;

    if (!activeTeamId) {
       return { success: false, message: "Equip actiu no trobat." };
    }

    try {
        const signedUrls = await Promise.all(
            fileNames.map(async (fileName) => {
                const fileExt = fileName.split('.').pop();
                
                // ✅ CORRECCIÓ 1: Path correcte que compleix la RLS
                // Estructura: 'social_media/[team_id]/[user_id]-[timestamp].[ext]'
                const filePath = `social_media/${activeTeamId}/${user.id}-${Date.now()}-${Math.random()}.${fileExt}`;
                
                const { data, error } = await supabase.storage
                    .from(bucketName) // Bucket correcte
                    .createSignedUploadUrl(filePath);

                if (error) {
                    console.error("Error RLS en crear Signed URL:", error.message);
                    throw new Error(`Error creant URL per a ${fileName}: ${error.message}`);
                }
                
                return { signedUrl: data.signedUrl, path: data.path };
            })
        );
        return { success: true, message: "URLs creades.", data: { signedUrls } };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconegut creant URLs signades.";
        return { success: false, message };
    }
}

/**
 * Crea un registre de publicació en esborrany.
 */
export async function createSocialPostAction(
    content: string,
    providers: string[],
    mediaPaths: string[] | null,
    mediaType: string | null
): Promise<ActionResult<SocialPost>> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) {
        return { success: false, message: validation.error };
    }
    const { supabase, user, activeTeamId } = validation;

    const t = await getTranslations('Planificador.toasts');

    let media_urls: string[] | null = null;
    if (mediaPaths && mediaPaths.length > 0) {
        media_urls = mediaPaths.map(path =>
            // ✅ CORRECCIÓ 2: Obtenim URL pública del bucket correcte
            supabase.storage.from(bucketName).getPublicUrl(path).data.publicUrl
        );
    }

    const { data: postData, error: postError } = await supabase
        // ✅ CORRECCIÓ 3: Inserim a la TAULA 'social_posts', NO al 'bucketName'
        .from('social_posts') 
        .insert({
            user_id: user.id,
            team_id: activeTeamId,
            provider: providers,
            content: content,
            media_url: media_urls,
            media_type: mediaType,
            status: 'draft',
        })
        .select()
        .single();

    if (postError) {
        console.error("Error creant la publicació:", postError);
        return { success: false, message: t('errorPostCreation') };
    }

    revalidatePath('/comunicacio/planificador');
    return { success: true, message: t('successDraftCreated'), data: postData };
}

/**
 * Planifica una publicació.
 */
export async function scheduleSocialPostAction(postId: number, scheduledAt: string): Promise<ActionResult> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) return { success: false, message: validation.error };
    const { supabase } = validation;

    const t = await getTranslations('Planificador.toasts');

    const { error } = await supabase
        // ✅ CORRECCIÓ 4: Actualitzem la TAULA 'social_posts'
        .from('social_posts')
        .update({ status: 'scheduled', scheduled_at: scheduledAt })
        .eq('id', postId);

    if (error) {
        console.error("Error planificant la publicació:", error);
        return { success: false, message: t('errorScheduling') };
    }

    revalidatePath('/comunicacio/planificador');
    return { success: true, message: t('successScheduled') };
}

/**
 * Retorna una publicació a l'estat d'esborrany.
 */
export async function unscheduleSocialPostAction(postId: number): Promise<ActionResult> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) return { success: false, message: validation.error };
    const { supabase } = validation;

    const t = await getTranslations('Planificador.toasts'); 
    
    const { error } = await supabase
        // ✅ CORRECCIÓ 5: Actualitzem la TAULA 'social_posts'
        .from('social_posts')
        .update({ status: 'draft', scheduled_at: null })
        .eq('id', postId);

    if (error) {
        console.error("Error desplanificant la publicació:", error);
        return { success: false, message: t('errorUnscheduling') };
    }

    revalidatePath('/comunicacio/planificador');
    return { success: true, message: t('successUnscheduled') };
}

/**
 * Elimina una publicació social.
 */
export async function deleteSocialPostAction(postId: number): Promise<ActionResult> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) return { success: false, message: validation.error };
    const { supabase } = validation;
    const t = await getTranslations('Planificador.toasts');

    // (Aquesta funció ja estava bé)
    const { data: post } = await supabase.from('social_posts').select('media_url').eq('id', postId).single();

    if (post && Array.isArray(post.media_url)) {
        try {
            const pathsToRemove = post.media_url.map((url: string) => {
                 // Extraiem el path relatiu del bucket (ex: 'social_media/team_id/file.png')
                const pathname = new URL(url).pathname;
                const pathParts = pathname.split(`/${bucketName}/`);
                return pathParts[1]; // Prenem la part després de '/assets-publics/'
            }).filter(Boolean) as string[];

            if (pathsToRemove.length > 0) {
                await supabase.storage.from(bucketName).remove(pathsToRemove);
            }
        } catch (e) {
            console.error("Error en eliminar de Storage:", e);
            // No aturem l'esborrat de la BD si falla l'esborrat del fitxer
        }
    }

    const { error: deleteError } = await supabase.from('social_posts').delete().eq('id', postId);

    if (deleteError) {
        console.error("Error eliminant la publicació:", deleteError);
        return { success: false, message: t('errorDeleting') };
    }

    revalidatePath('/comunicacio/planificador');
    return { success: true, message: t('successPostDeleted') };
}