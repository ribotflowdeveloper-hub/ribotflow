"use server";

import { revalidatePath } from "next/cache";
import type { SocialPost } from "@/types/comunicacio/SocialPost";
import { getTranslations } from "next-intl/server";
import { validateUserSession } from "@/lib/supabase/session";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

// Aquest tipus de retorn es pot moure a un fitxer de tipus globals si el fas servir a més llocs.

// ✅ CORRECCIÓ 1: El missatge ara és opcional.
type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

/**
 * Funció d'ajuda interna per a validar la sessió i els permisos específics del planificador.
 * Evita repetir el mateix codi a cada acció.
 */
async function validateSocialPlannerPermissions() {
    const session = await validateUserSession();
    if ('error' in session) {
        return { error: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    // Comprovem si l'usuari té permís per a gestionar integracions/planificador.
    const hasAccess = await checkUserPermission(supabase, user.id, activeTeamId, PERMISSIONS.MANAGE_INTEGRATIONS);
    if (!hasAccess) {
        const t = await getTranslations('Errors');
        return { error: t('permissionDenied') };
    }
    
    return { supabase, user, activeTeamId };
}

// ----------------------------------------------------------------------------------

/**
 * Crea una URL de pujada signada (presigned URL) a Supabase Storage.
 */
export async function getPresignedUploadUrlAction(fileNames: string[]): Promise<ActionResult<{ signedUrls: { signedUrl: string; path: string; }[] }>> {
    // Aquesta acció només requereix que l'usuari estigui autenticat.
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user } = session;

    try {
        const signedUrls = await Promise.all(
            fileNames.map(async (fileName) => {
                const fileExt = fileName.split('.').pop();
                const filePath = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
                const { data, error } = await supabase.storage
                    .from('social_media')
                    .createSignedUploadUrl(filePath);
                
                if (error) throw new Error(`Error creant URL per a ${fileName}: ${error.message}`);
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
        // ✅ CORRECCIÓ: Retornem el missatge d'error de la validació
        return { success: false, message: validation.error };
    }
    const { supabase, user, activeTeamId } = validation;
    
    const t = await getTranslations('Planificador.toasts');

    let media_urls: string[] | null = null;
    if (mediaPaths && mediaPaths.length > 0) {
        media_urls = mediaPaths.map(path => 
            supabase.storage.from('social_media').getPublicUrl(path).data.publicUrl
        );
    }

    const { data: postData, error: postError } = await supabase
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

    // ✅ CORRECCIÓ: Canviem el 'namespace' al que correspon.
    const t = await getTranslations('Planificador.toasts');
    
    const { error } = await supabase
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

    const t = await getTranslations('SocialPlanner.toasts');
    const { error } = await supabase
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
  const t = await getTranslations('SocialPlanner.toasts');
  
  const { data: post } = await supabase.from('social_posts').select('media_url').eq('id', postId).single();

  if (post && Array.isArray(post.media_url)) {
      try {
          // ✅ CORRECCIÓ 2: Afegim el tipus explícit a 'url'.
          const pathsToRemove = post.media_url.map((url: string) => 
              new URL(url).pathname.split('/social_media/')[1]
          ).filter(Boolean);
          
          if (pathsToRemove.length > 0) {
              await supabase.storage.from('social_media').remove(pathsToRemove);
          }
      } catch (e) {
          console.error("Error en eliminar de Storage:", e);
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