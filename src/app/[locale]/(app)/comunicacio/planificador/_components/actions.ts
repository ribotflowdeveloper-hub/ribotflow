"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { SocialPost } from "@/types/comunicacio/SocialPost";

// Tipus per a la resposta de les nostres accions
type ActionResult = {
  success: boolean;
  message?: string;
  data?: SocialPost | SocialPost[];
};

/**
 * Puja un arxiu a Supabase Storage i crea un registre de publicació en esborrany.
 */
export async function createSocialPostAction(formData: FormData): Promise<ActionResult> {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuari no autenticat." };

  const content = formData.get('content') as string;
  const provider = formData.get('provider') as string;
  const mediaFile = formData.get('media') as File;

  let media_url = null;
  let media_type = null;

  if (mediaFile && mediaFile.size > 0) {
    const fileExt = mediaFile.name.split('.').pop();
    const fileName = `${user.id}/${new Date().getTime()}.${fileExt}`;
    
    // Pugem l'arxiu al bucket 'social_media'
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('social_media')
      .upload(fileName, mediaFile);

    if (uploadError) {
      console.error("Error pujant l'arxiu:", uploadError);
      return { success: false, message: "No s'ha pogut pujar l'arxiu multimèdia." };
    }
    
    // Obtenim la URL pública de l'arxiu
    const { data: publicUrlData } = supabase
      .storage
      .from('social_media')
      .getPublicUrl(uploadData.path);
      
    media_url = publicUrlData.publicUrl;
    media_type = mediaFile.type.startsWith('image') ? 'image' : 'video';
  }

  // Creem el registre a la taula 'social_posts'
  const { data: postData, error: postError } = await supabase
    .from('social_posts')
    .insert({
      user_id: user.id,
      provider: provider,
      content: content,
      media_url: media_url,
      media_type: media_type,
      status: 'draft',
    })
    .select()
    .single();

  if (postError) {
    console.error("Error creant la publicació:", postError);
    return { success: false, message: "No s'ha pogut guardar la publicació." };
  }

  revalidatePath('/comunicacio/planificador');
  return { success: true, message: "Esborrany creat correctament.", data: postData };
}

/**
 * Planifica una publicació per a una data i hora concretes.
 */
export async function scheduleSocialPostAction(postId: number, scheduledAt: string): Promise<ActionResult> {
  const supabase = createClient(cookies());
  const { error } = await supabase
    .from('social_posts')
    .update({
      status: 'scheduled',
      scheduled_at: scheduledAt
    })
    .eq('id', postId);

  if (error) {
    console.error("Error planificant la publicació:", error);
    return { success: false, message: "No s'ha pogut planificar la publicació." };
  }

  revalidatePath('/comunicacio/planificador');
  return { success: true };
}

/**
 * ✅ NOU: Converteix una publicació planificada de nou en un esborrany.
 */
export async function unscheduleSocialPostAction(postId: number): Promise<ActionResult> {
  const supabase = createClient(cookies());
  const { error } = await supabase
    .from('social_posts')
    .update({
      status: 'draft',
      scheduled_at: null
    })
    .eq('id', postId);

  if (error) {
    console.error("Error desplanificant la publicació:", error);
    return { success: false, message: "No s'ha pogut moure a esborranys." };
  }

  revalidatePath('/comunicacio/planificador');
  return { success: true };
}


/**
 * ✅ NOU: Elimina una publicació social.
 */
export async function deleteSocialPostAction(postId: number): Promise<ActionResult> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    // Primer, obtenim la URL de l'arxiu per a poder esborrar-lo de l'Storage
    const { data: post } = await supabase
        .from('social_posts')
        .select('media_url')
        .eq('id', postId)
        .single();
    
    if (post && post.media_url) {
        const fileName = post.media_url.split('/').pop();
        if (fileName) {
            await supabase.storage.from('social_media').remove([`${user.id}/${fileName}`]);
        }
    }

    // Després, eliminem el registre de la base de dades
    const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

    if (error) {
        console.error("Error eliminant la publicació:", error);
        return { success: false, message: "No s'ha pogut eliminar la publicació." };
    }

    revalidatePath('/comunicacio/planificador');
    return { success: true };
}

