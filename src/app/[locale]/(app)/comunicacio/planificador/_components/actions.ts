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
export async function getPresignedUploadUrlAction(fileName: string): Promise<ActionResult<{ signedUrl: string; token: string; path: string; filePath: string }>> {
  const t = await getTranslations('SocialPlanner.toasts');
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: t('errorNotAuthenticated') };

  const fileExt = fileName.split('.').pop();
  const filePath = `${user.id}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('social_media')
    .createSignedUploadUrl(filePath);

  if (error) {
    console.error("Error creant la URL signada:", error);
    return { success: false, message: t('errorMediaUpload') };
  }

  return { success: true, message: "URL creada.", data: { ...data, filePath } };
}

/**
 * Crea un registre de publicació en esborrany.
 */
export async function createSocialPostAction(
  content: string,
  providers: string[],
  mediaPath: string | null,
  mediaType: string | null
): Promise<ActionResult<SocialPost>> {
  const t = await getTranslations('SocialPlanner.toasts');
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: t('errorNotAuthenticated') };

  let media_url = null;
  if (mediaPath) {
    const { data: publicUrlData } = supabase.storage.from('social_media').getPublicUrl(mediaPath);
    media_url = publicUrlData.publicUrl;
  }

  const { data: postData, error: postError } = await supabase
    .from('social_posts')
    .insert({
      user_id: user.id,
      provider: providers,
      content: content,
      media_url: media_url,
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
  const supabase = createClient(cookies());
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
  const supabase = createClient(cookies());
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
  const supabase = createClient(cookies());
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