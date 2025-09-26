"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { SocialPost } from "@/types/comunicacio/SocialPost";
import { getTranslations } from "next-intl/server";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

/**
 * Crea una URL de pujada signada (presigned URL) a Supabase Storage.
 */
// ✅ Aquesta acció ara gestiona múltiples fitxers
export async function getPresignedUploadUrlAction(fileNames: string[]): Promise<ActionResult<{ signedUrls: { signedUrl: string; path: string; }[] }>> {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticat." };

  const signedUrls = await Promise.all(
      fileNames.map(async (fileName) => {
          const fileExt = fileName.split('.').pop();
          const filePath = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
          const { data, error } = await supabase.storage
              .from('social_media')
              .createSignedUploadUrl(filePath);
          
          if (error) throw new Error(`Error creant URL per a ${fileName}`);
          return { signedUrl: data.signedUrl, path: data.path };
      })
  );

  return { success: true, message: "URLs creades.", data: { signedUrls } };
}

/**
 * Crea un registre de publicació en esborrany.
 */
export async function createSocialPostAction(
  content: string,
  providers: string[],
  mediaPaths: string[] | null, // <-- Ara és un array
  mediaType: string | null
): Promise<ActionResult<SocialPost>> {
  const t = await getTranslations('SocialPlanner.toasts');
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: t('errorNotAuthenticated') };

  // Obtenim l'equip actiu del token
  const activeTeamId = user.app_metadata?.active_team_id;
  if (!activeTeamId) return { success: false, message: "No s'ha pogut determinar l'equip actiu." };

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
          team_id: activeTeamId, // ✅ Assignem l'equip actiu
          provider: providers,
          content: content,
          media_url: media_urls, // <-- Guardem l'array
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
  const t = await getTranslations('SocialPlanner.toasts');
  const supabase = createClient(cookies())
;
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
  const t = await getTranslations('SocialPlanner.toasts');
  const supabase = createClient(cookies())
;
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
  const t = await getTranslations('SocialPlanner.toasts');
  const supabase = createClient(cookies())
;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: t('errorNotAuthenticated') };

  const { data: post } = await supabase
    .from('social_posts')
    .select('media_url')
    .eq('id', postId)
    .single();

  if (post && post.media_url) {
    try {
      const url = new URL(post.media_url);
      const filePath = url.pathname.split('/social_media/')[1];
      if (filePath) await supabase.storage.from('social_media').remove([filePath]);
    } catch (e) {
      console.error("URL de mèdia invàlida o error en eliminar de Storage:", e);
    }
  }

  const { error: deleteError } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error("Error eliminant la publicació:", deleteError);
    return { success: false, message: t('errorDeleting') };
  }

  revalidatePath('/comunicacio/planificador');
  return { success: true, message: t('successPostDeleted') };
}