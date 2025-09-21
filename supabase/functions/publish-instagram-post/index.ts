import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: posts, error: postsError } = await supabaseAdmin
      .from('social_posts')
      .select('*')
      .eq('status', 'scheduled')
      .eq('provider', 'instagram') // Busquem només les publicacions d'Instagram
      .lte('scheduled_at', new Date().toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No hi ha publicacions d'Instagram per a enviar." }));
    }
    
    for (const post of posts) {
      const { data: creds } = await supabaseAdmin
        .from('user_credentials')
        .select('access_token, provider_page_id') // A Instagram, el provider_page_id serà l'ID del compte d'Instagram
        .eq('user_id', post.user_id)
        .eq('provider', 'instagram')
        .single();

      if (!creds?.access_token || !creds.provider_page_id) {
        await updatePostStatus(supabaseAdmin, post, 'failed', 'No s\'han trobat credencials d\'Instagram vàlides.');
        continue;
      }

      try {
        if (!post.media_url) {
          throw new Error("Instagram requereix una imatge o vídeo per a publicar.");
        }
        
        // Pas 1: Pujar la imatge a un servidor accessible públicament (ja la tenim a Supabase Storage)
        // Pas 2: Crear el "contenidor" de la publicació a Instagram
        const createContainerUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/media`;
        const containerParams = new URLSearchParams({
          image_url: post.media_url,
          caption: post.content || '',
          access_token: creds.access_token,
        });

        const containerResponse = await fetch(`${createContainerUrl}?${containerParams.toString()}`, { method: 'POST' });
        const containerData = await containerResponse.json();
        if (!containerResponse.ok) throw new Error(JSON.stringify(containerData.error));

        const creationId = containerData.id;

        // Pas 3: Publicar el contenidor
        const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/media_publish`;
        const publishParams = new URLSearchParams({
          creation_id: creationId,
          access_token: creds.access_token,
        });
        
        const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
        const publishData = await publishResponse.json();
        if (!publishResponse.ok) throw new Error(JSON.stringify(publishData.error));

        await updatePostStatus(supabaseAdmin, post, 'published', null);
        
      } catch (e) {
        await updatePostStatus(supabaseAdmin, post, 'failed', e.message);
      }
    }

    return new Response(JSON.stringify({ status: 'ok', processed: posts.length }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function updatePostStatus(supabase: any, post: any, status: string, errorMessage: string | null) {
  await supabase
    .from('social_posts')
    .update({ status, error_message: errorMessage, published_at: status === 'published' ? new Date().toISOString() : null })
    .eq('id', post.id);
}