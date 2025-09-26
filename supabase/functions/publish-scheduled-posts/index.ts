import { createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// --- DEFINICIÓ DE TIPUS ---
// Definim tipus clars per a les dades amb les que treballem per a més seguretat.
type SocialPost = {
    id: number;
    user_id: string;
    team_id: string;
    provider: string[];
    content?: string | null;
    media_url?: string[] | null; // Pot ser un array d'URLs
    media_type?: 'image' | 'video' | null;
};

type Credentials = {
    access_token: string;
    provider_user_id?: string | null;
    provider_page_id?: string | null;
};



// --- FUNCIÓ PRINCIPAL DEL WORKER ---
serve(async (req) => {
    try {
        console.log("\n--- [INFO] Funció 'social-publisher' invocada. ---");

        // Comprovació de seguretat
        const authHeader = req.headers.get('Authorization');
        if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
            return new Response('Unauthorized', { status: 401, headers: corsHeaders });
        }

        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // 1. Busquem tots els posts programats
        const { data: posts, error: postsError } = await supabaseAdmin
            .from('social_posts')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', new Date().toISOString());

        const nowISO = new Date().toISOString();
        console.log(`[INFO] Buscant publicacions programades abans de: ${nowISO}`);
        if (postsError) throw postsError;
        if (!posts || posts.length === 0) {
            console.log("[INFO] No s'han trobat publicacions per a processar. Finalitzant correctament.");

            return new Response(JSON.stringify({ message: "No hi ha publicacions per a enviar." }));
        }

        // 2. Processem cada publicació
        for (const post of posts as SocialPost[]) {
            if (!post.team_id) {
                // ✅ CORRECCIÓ: Cridem directament a 'createNotification'
                await createNotification(supabaseAdmin, post, 'system', false, "La publicació no té un equip assignat.");
                continue;
            }

            let successCount = 0;
            // 3. Iterem sobre els proveïdors (LinkedIn, Facebook, etc.)
            for (const provider of post.provider) {
                try {

                    const { data: creds, error: credsError } = await supabaseAdmin
                        .from('team_credentials')
                        .select('access_token, provider_user_id, provider_page_id')
                        .eq('team_id', post.team_id)
                        .eq('provider', provider)
                        .single();

                    if (credsError) throw credsError;
                    console.log(`[Post ID: ${post.id}] Credencials trobades. Publicant a '${provider}'...`);

                    // 4. Cridem a la funció de publicació corresponent
                    if (provider === 'linkedin') await publishToLinkedIn(creds, post);
                    else if (provider === 'facebook') await publishToFacebook(creds, post);
                    else if (provider === 'instagram') await publishToInstagram(creds, post);

                    await createNotification(supabaseAdmin, post, provider, true, null);
                    console.log(`[Post ID: ${post.id}] Publicat amb èxit a '${provider}'.`);

                    successCount++;
                } catch (e) {
                    console.error(`[ERROR] [Post ID: ${post.id}] Error publicant a '${provider}':`, e.message);

                    await createNotification(supabaseAdmin, post, provider, false, e.message);
                }
            }

            // 5. Actualitzem l'estat final de la publicació
            const finalStatus = successCount === post.provider.length ? 'published' : (successCount > 0 ? 'partial_success' : 'failed');
            await supabaseAdmin.from('social_posts').update({ status: finalStatus, published_at: new Date().toISOString() }).eq('id', post.id);
        }
        console.log("--- [SUCCESS] Funció finalitzada correctament. ---");

        return new Response(JSON.stringify({ status: 'ok', processed: posts.length }));
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    }
});
// --- FUNCIONS AUXILIARS DE PUBLICACIÓ (AMB LA CORRECCIÓ A LINKEDIN) ---

async function publishToLinkedIn(creds: Credentials, post: SocialPost) {
    if (!creds.provider_user_id) throw new Error("Falta l'ID d'usuari de LinkedIn.");
    
    let mediaPayload: { shareMediaCategory: string; media?: { status: string; media: string }[] } = { shareMediaCategory: 'NONE' };
    const mediaUrls = post.media_url || [];

    if (mediaUrls.length > 0) {
        const assetURNs = await Promise.all(
            mediaUrls.map(url => uploadMediaToLinkedIn(url, post.media_type!, creds.access_token, creds.provider_user_id!))
        );
        mediaPayload = {
            shareMediaCategory: post.media_type!.toUpperCase(),
            media: assetURNs.map((urn: string) => ({ status: 'READY', media: urn })),
        };
    }

    // ✅ TORNEM A L'ESTRUCTURA DE L'API ANTIGA I ESTABLE
    const postBody = {
        author: `urn:li:person:${creds.provider_user_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text: post.content || ''
                },
                ...mediaPayload
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    };

    // ✅ UTILITZEM L'ENDPOINT ANTIC I ESTABLE
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${creds.access_token}`, 
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
            // NO necessitem la capçalera 'LinkedIn-Version'
        },
        body: JSON.stringify(postBody)
    });
    if (!response.ok) throw new Error(`API Error LinkedIn: ${await response.text()}`);
}

async function uploadMediaToLinkedIn(mediaUrl: string, mediaType: 'image' | 'video', accessToken: string, providerUserId: string): Promise<string> {
    const recipe = mediaType === 'image' ? 'urn:li:digitalmediaRecipe:feedshare-image' : 'urn:li:digitalmediaRecipe:feedshare-video';
    
    // ✅ UTILITZEM L'ENDPOINT ANTIC I ESTABLE PER A PUJAR FITXERS
    const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "registerUploadRequest": {
                "recipes": [recipe],
                "owner": `urn:li:person:${providerUserId}`,
                "serviceRelationships": [{ "relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent" }]
            }
        })
    });
    if (!registerResponse.ok) throw new Error(`Error en registrar la pujada: ${await registerResponse.text()}`);
    
    const registerData = await registerResponse.json();
    const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const assetURN = registerData.value.asset;

    // La resta de la pujada és igual
    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok) throw new Error("No s'ha pogut descarregar el mèdia de Supabase Storage.");
    const mediaBlob = await mediaResponse.blob();

    const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mediaBlob.type }, body: mediaBlob });
    if (!uploadResponse.ok) throw new Error(`Error en pujar el mèdia a LinkedIn: ${await uploadResponse.text()}`);

    return assetURN;
}

async function publishToFacebook(creds: Credentials, post: SocialPost) {
    if (!creds.provider_page_id) throw new Error("Falta l'ID de la pàgina de Facebook.");
    const mediaUrls = post.media_url || [];

    if (mediaUrls.length > 1) { // Carrusel d'imatges
        const attachedMediaIds = await Promise.all(
            mediaUrls.map(async (url) => {
                const uploadUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/photos?url=${encodeURIComponent(url)}&published=false&access_token=${creds.access_token}`;
                const res = await fetch(uploadUrl, { method: 'POST' });
                const data = await res.json();
                if (!res.ok) throw new Error(JSON.stringify(data.error));
                return { media_fbid: data.id };
            })
        );
        const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/feed`;
        const body = { message: post.content, attached_media: attachedMediaIds, access_token: creds.access_token };
        const res = await fetch(publishUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
    } else { // Text sol, imatge única o vídeo únic
        let endpoint = 'feed';
        let body: unknown = { message: post.content, access_token: creds.access_token };
        if (mediaUrls.length === 1) {
            if (post.media_type === 'image') {
                endpoint = 'photos';
                body = { caption: post.content, url: mediaUrls[0], access_token: creds.access_token };
            } else if (post.media_type === 'video') {
                endpoint = 'videos';
                body = { description: post.content, file_url: mediaUrls[0], access_token: creds.access_token };
            }
        }
        const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/${endpoint}`;
        const res = await fetch(publishUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
    }
}

async function publishToInstagram(creds: Credentials, post: SocialPost) {
    if (!creds.provider_page_id) throw new Error("Falta l'ID del compte d'Instagram.");
    const mediaUrls = post.media_url || [];
    if (mediaUrls.length === 0) throw new Error("Instagram requereix almenys un element multimèdia.");

    // 1. Creem els contenidors per a cada imatge/vídeo
    const itemContainerIds = await Promise.all(
        mediaUrls.map(async (url) => {
            const params = new URLSearchParams({ access_token: creds.access_token, is_carousel_item: (mediaUrls.length > 1).toString() });
            if (post.media_type === 'image') {
                params.append('image_url', url);
            } else {
                params.append('video_url', url);
                params.append('media_type', 'VIDEO');
            }
            const res = await fetch(`https://graph.facebook.com/v19.0/${creds.provider_page_id}/media?${params.toString()}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(JSON.stringify(data.error));
            return data.id;
        })
    );

    // 2. Si és un carrusel, creem el contenidor principal. Si no, utilitzem l'ID de l'únic element.
    const creationId = mediaUrls.length > 1
        ? await createCarouselContainer(creds, itemContainerIds, post.content || '')
        : itemContainerIds[0];

    // 3. ✅ BUCLE D'ESPERA (POLLING) MÉS ROBUST
    console.log(`[Instagram] Esperant que el contenidor ${creationId} estigui llest...`);
    let isReady = false;
    for (let attempts = 0; attempts < 20; attempts++) {
        const statusUrl = `https://graph.facebook.com/v19.0/${creationId}?fields=status_code,status&access_token=${creds.access_token}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();
        
        console.log(`[Instagram] Intent ${attempts + 1}: Estat del contenidor - ${statusData.status_code}`);

        if (statusData.status_code === 'FINISHED') {
            isReady = true;
            break;
        }
        if (statusData.status_code === 'ERROR') {
            console.error("[Instagram] Error rebut de l'API durant el processament:", statusData);
            throw new Error(`Error en el processament del mèdia per part d'Instagram: ${statusData.status}`);
        }
        // Esperem 5 segons abans del següent intent
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    if (!isReady) throw new Error("El contenidor no s'ha processat a temps després de diversos intents.");

    // 4. Publiquem el contenidor un cop està llest
    console.log(`[Instagram] Contenidor ${creationId} llest. Publicant...`);
    const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/media_publish`;
    const publishParams = new URLSearchParams({ creation_id: creationId, access_token: creds.access_token });
    const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
    if (!publishResponse.ok) throw new Error(JSON.stringify((await publishResponse.json()).error));
    console.log(`[Instagram] Publicat amb èxit.`);
}

// --- ALTRES FUNCIONS AUXILIARS ---

// --- ALTRES FUNCIONS AUXILIARS ---

async function createCarouselContainer(creds: Credentials, itemIds: string[], caption: string): Promise<string> {
    const url = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/media`;
    const params = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: itemIds.join(','),
        caption: caption,
        access_token: creds.access_token,
    });
    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(`Error creant el contenidor de carrusel: ${JSON.stringify(data.error)}`);
    return data.id;
}




/**
 * Funció auxiliar per a crear notificacions.
 */ 
async function createNotification(supabase, post, provider, success, errorMessage) {
    const providerName = provider.replace('_oidc', '').replace(/^\w/, (c)=>c.toUpperCase());
    const now = new Date();
    const time = now.toLocaleTimeString('ca-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const date = now.toLocaleDateString('ca-ES');
    const message = success ? `✅ Publicació a ${providerName} enviada amb èxit (${date} a les ${time}).` : `❌ Error en publicar a ${providerName} (${date} a les ${time}): ${errorMessage?.substring(0, 100)}...`;
    if (!post.user_id) {
      console.error(`No s'ha pogut crear la notificació per al post ${post.id} perquè no té user_id.`);
      return;
    }
    await supabase.from('notifications').insert({
      user_id: post.user_id,
      team_id: post.team_id,
      message: message,
      type: success ? 'post_published' : 'post_failed'
    });
  }
  