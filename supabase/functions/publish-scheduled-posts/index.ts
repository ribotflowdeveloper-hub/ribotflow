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
      .lte('scheduled_at', new Date().toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No hi ha publicacions per a enviar." }));
    }
    
    for (const post of posts) {
      let successCount = 0;
      for (const provider of post.provider) {
        try {
          const { data: creds } = await supabaseAdmin
            .from('user_credentials')
            .select('access_token, provider_user_id, provider_page_id')
            .eq('user_id', post.user_id)
            .eq('provider', provider)
            .single();

          if (!creds?.access_token) throw new Error('No s\'han trobat credencials vàlides.');

          if (provider === 'linkedin_oidc') {
            await publishToLinkedIn(creds, post);
          } else if (provider === 'facebook') {
            await publishToFacebook(creds, post);
          } else if (provider === 'instagram') {
            await publishToInstagram(creds, post);
          }

          await createNotification(supabaseAdmin, post, provider, true);
          successCount++;
        } catch (e) {
          await createNotification(supabaseAdmin, post, provider, false, e.message);
        }
      }
      
      const finalStatus = successCount === post.provider.length ? 'published' : (successCount > 0 ? 'partial_success' : 'failed');
      await supabaseAdmin.from('social_posts').update({ status: finalStatus, published_at: new Date().toISOString() }).eq('id', post.id);
    }

    return new Response(JSON.stringify({ status: 'ok', processed: posts.length }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

// --- Funcions Auxiliars de Publicació Específiques ---

async function publishToLinkedIn(creds: any, post: any) {
  if (!creds.provider_user_id) throw new Error("Falta l'ID d'usuari de LinkedIn.");
  
  let mediaPayload = {};
  if (post.media_url) {
    const assetURN = await uploadMediaToLinkedIn(post.media_url, post.media_type, creds.access_token, creds.provider_user_id);
    mediaPayload = {
      shareMediaCategory: post.media_type.toUpperCase(),
      media: [{ status: 'READY', media: assetURN }],
    };
  } else {
    mediaPayload = { shareMediaCategory: 'NONE' };
  }

  const postContent = {
    author: `urn:li:person:${creds.provider_user_id}`,
    lifecycleState: 'PUBLISHED',
    specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: post.content! }, ...mediaPayload } },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creds.access_token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(postContent),
  });
  if (!response.ok) throw new Error(`API Error: ${await response.text()}`);
}

async function publishToFacebook(creds: any, post: any) {
  if (!creds.provider_page_id) throw new Error("Falta l'ID de la pàgina de Facebook.");
  
  let endpoint = 'feed';
  let body: any;

  if (post.media_url) {
    if (post.media_type === 'image') {
      endpoint = 'photos';
      body = { caption: post.content, url: post.media_url };
    } else if (post.media_type === 'video') {
      endpoint = 'videos';
      body = { description: post.content, file_url: post.media_url };
    }
  } else {
    body = { message: post.content };
  }

  const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/${endpoint}?access_token=${creds.access_token}`;
  const response = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const responseData = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(responseData.error));
}

async function publishToInstagram(creds: any, post: any) {
  if (!creds.provider_page_id) throw new Error("Falta l'ID del compte d'Instagram.");
  if (!post.media_url) throw new Error("Instagram requereix una imatge o vídeo.");

  const createContainerUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/media`;
  
  const containerParams = new URLSearchParams({
    caption: post.content || '',
    access_token: creds.access_token,
  });
  if (post.media_type === 'image') {
    containerParams.append('image_url', post.media_url);
  } else {
    containerParams.append('video_url', post.media_url);
    containerParams.append('media_type', 'VIDEO');
  }

  const containerResponse = await fetch(`${createContainerUrl}?${containerParams.toString()}`, { method: 'POST' });
  const containerData = await containerResponse.json();
  if (!containerResponse.ok) throw new Error(JSON.stringify(containerData.error));

  const creationId = containerData.id;

  let isContainerReady = false;
  let attempts = 0;
  while (!isContainerReady && attempts < 20) {
    const statusUrl = `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${creds.access_token}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    if (statusData.status_code === 'FINISHED') {
      isContainerReady = true;
    } else if (statusData.status_code === 'ERROR') {
      throw new Error("Error en el processament del mèdia per part d'Instagram.");
    } else {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  if (!isContainerReady) throw new Error("El contenidor no s'ha processat a temps.");

  const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/media_publish`;
  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: creds.access_token });
  const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
  if (!publishResponse.ok) throw new Error(JSON.stringify((await publishResponse.json()).error));
}

// --- Funció Auxiliar per a Pujar Mèdia a LinkedIn ---
async function uploadMediaToLinkedIn(mediaUrl: string, mediaType: string, accessToken: string, providerUserId: string): Promise<string> {
  const recipe = mediaType === 'image' ? 'urn:li:digitalmediaRecipe:feedshare-image' : 'urn:li:digitalmediaRecipe:feedshare-video';
  
  const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ "registerUploadRequest": { "recipes": [recipe], "owner": `urn:li:person:${providerUserId}`, "serviceRelationships": [{ "relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent" }] } })
  });
  if (!registerResponse.ok) throw new Error(`Error en registrar la pujada: ${await registerResponse.text()}`);
  const registerData = await registerResponse.json();
  const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetURN = registerData.value.asset;

  const mediaResponse = await fetch(mediaUrl);
  if (!mediaResponse.ok) throw new Error("No s'ha pogut descarregar el mèdia de Supabase Storage.");
  const mediaBlob = await mediaResponse.blob();

  const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mediaBlob.type }, body: mediaBlob });
  if (!uploadResponse.ok) throw new Error(`Error en pujar el mèdia a LinkedIn: ${await uploadResponse.text()}`);

  return assetURN;
}

// --- Funció Auxiliar per a Crear Notificacions ---
async function createNotification(supabase: any, post: any, provider: string, success: boolean, errorMessage?: string) {
  const providerName = provider.replace('_oidc', '').replace(/^\w/, c => c.toUpperCase());
  const now = new Date();
  const time = now.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('ca-ES');
  
  const message = success
    ? `✅ Publicació a ${providerName} enviada amb èxit (${date} a les ${time}).`
    : `❌ Error en publicar a ${providerName} (${date} a les ${time}): ${errorMessage?.substring(0, 100)}...`;
  
  await supabase.from('notifications').insert({
    user_id: post.user_id,
    message: message,
    type: success ? 'post_published' : 'post_failed'
  });
}

