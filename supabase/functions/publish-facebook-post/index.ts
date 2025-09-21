import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')!;
    if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: posts, error: postsError } = await supabaseAdmin
      .from('social_posts')
      .select('*')
      .eq('status', 'scheduled')
      .eq('provider', 'facebook') // Busquem només les publicacions de Facebook
      .lte('scheduled_at', new Date().toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No hi ha publicacions de Facebook per a enviar." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    
    for (const post of posts) {
      const { data: creds } = await supabaseAdmin
        .from('user_credentials')
        .select('access_token, provider_page_id')
        .eq('user_id', post.user_id)
        .eq('provider', 'facebook')
        .single();

      if (!creds?.access_token || !creds.provider_page_id) {
        await handlePublishError(supabaseAdmin, post, 'No s\'han trobat credencials de pàgina de Facebook vàlides.');
        continue;
      }

      try {
        const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/feed`;
        const response = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: post.content,
            access_token: creds.access_token,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(JSON.stringify(errorBody.error));
        }
        
        // La publicació ha tingut èxit
        await supabaseAdmin.from('social_posts').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', post.id);
        await supabaseAdmin.from('notifications').insert({ user_id: post.user_id, message: `La teva publicació a Facebook s'ha enviat amb èxit.`, type: 'post_published' });
        
      } catch (e) {
        await handlePublishError(supabaseAdmin, post, e.message);
      }
    }

    return new Response(JSON.stringify({ status: 'ok', processed: posts.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function handlePublishError(supabase: any, post: any, errorMessage: string) {
  await supabase.from('social_posts').update({ status: 'failed', error_message: errorMessage }).eq('id', post.id);
  await supabase.from('notifications').insert({ user_id: post.user_id, message: `Error en publicar a Facebook: "${post.content?.substring(0, 20)}...".`, type: 'post_failed' });
}

