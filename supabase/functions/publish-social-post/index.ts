import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Funció principal que s'executa amb el Cron Job
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
      .lte('scheduled_at', new Date().toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No hi ha publicacions per a enviar." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    for (const post of posts) {
      const { data: creds, error: credsError } = await supabaseAdmin
        .from('user_credentials')
        .select('access_token, provider_user_id')
        .eq('user_id', post.user_id)
        .eq('provider', post.provider)
        .single();

      if (credsError || !creds?.access_token || !creds.provider_user_id) {
        await handlePublishError(supabaseAdmin, post, `No s'han trobat credencials vàlides.`);
        continue;
      }

      try {
        let postContent: any;

        // ✅ NOVA LÒGICA: Comprovem si la publicació té una imatge.
        if (post.media_url && post.media_type === 'image') {
          // Si té imatge, seguim el flux de pujada de LinkedIn.
          const assetURN = await uploadImageToLinkedIn(post.media_url, creds.access_token, creds.provider_user_id);
          postContent = {
            author: `urn:li:person:${creds.provider_user_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: post.content! },
                shareMediaCategory: 'IMAGE',
                media: [{ status: 'READY', media: assetURN }],
              },
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
          };
        } else {
          // Si només és text, fem servir el format que ja teníem.
          postContent = {
            author: `urn:li:person:${creds.provider_user_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: post.content! },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
          };
        }

        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${creds.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(postContent),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(JSON.stringify(errorBody));
        }
        
        // La publicació ha tingut èxit
        await handlePublishSuccess(supabaseAdmin, post);
        
      } catch (e) {
        await handlePublishError(supabaseAdmin, post, e.message);
      }
    }

    return new Response(JSON.stringify({ status: 'ok', processed: posts.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ✅ NOVA FUNCIÓ: S'encarrega del procés de 3 passos per a pujar una imatge a LinkedIn.
async function uploadImageToLinkedIn(mediaUrl: string, accessToken: string, providerUserId: string): Promise<string> {
  // Pas 1: Registrar la pujada per a obtenir una URL especial.
  const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "registerUploadRequest": {
        "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
        "owner": `urn:li:person:${providerUserId}`,
        "serviceRelationships": [{ "relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent" }]
      }
    })
  });
  if (!registerResponse.ok) throw new Error("Error en registrar la pujada de la imatge a LinkedIn.");
  const registerData = await registerResponse.json();
  const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetURN = registerData.value.asset;

  // Pas 2: Descarregar la imatge de Supabase i pujar-la a la URL de LinkedIn.
  const imageResponse = await fetch(mediaUrl);
  if (!imageResponse.ok) throw new Error("No s'ha pogut descarregar la imatge de Supabase Storage.");
  const imageBlob = await imageResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': imageBlob.type },
    body: imageBlob,
  });
  if (!uploadResponse.ok) throw new Error("Error en pujar la imatge a LinkedIn.");

  // Pas 3: Retornem l'identificador de l'actiu (asset URN) per a poder-lo adjuntar a la publicació.
  return assetURN;
}

// Funcions auxiliars per a gestionar l'èxit o l'error
async function handlePublishSuccess(supabase: any, post: any) {
  await supabase
    .from('social_posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', post.id);

  await supabase.from('notifications').insert({
    user_id: post.user_id,
    message: `La teva publicació a LinkedIn s'ha enviat amb èxit.`,
    type: 'post_published'
  });
}

async function handlePublishError(supabase: any, post: any, errorMessage: string) {
  await supabase
    .from('social_posts')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', post.id);
  
  await supabase.from('notifications').insert({
    user_id: post.user_id,
    message: `Error en publicar a LinkedIn: "${post.content?.substring(0, 20)}...".`,
    type: 'post_failed'
  });
}

