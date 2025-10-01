// Ubicació: /supabase/functions/social-publisher/_lib/publishers.ts

import type { Post, Credentials, FacebookBody } from './types.ts'; // Error aquí

// --- FUNCIONS DE PUBLICACIÓ (APIs EXTERNES) ---

async function publishToLinkedIn(creds: Credentials, post: Post) {
    if (!creds.provider_user_id) throw new Error("Falta l'ID d'usuari de LinkedIn.");

    let mediaPayload = {};
    const mediaUrls = post.media_url || [];
    
    if (mediaUrls.length > 0) {
        if (!post.media_type) throw new Error("Falta el tipus de mèdia (image/video).");
        
        const assetURNs = await Promise.all(
            mediaUrls.map((url) => uploadMediaToLinkedIn(url, post.media_type!, creds.access_token, creds.provider_user_id!))
        );
        
        mediaPayload = {
            media: assetURNs.map((urn) => ({
                status: 'READY',
                media: urn,
                ...(assetURNs.length === 1 && {
                    title: { text: post.content.substring(0, 200) },
                    description: { text: post.content }
                })
            }))
        };
    }

    const postBody = {
        author: `urn:li:person:${creds.provider_user_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: post.content || '' },
                shareMediaCategory: mediaUrls.length > 0 ? (post.media_type === 'image' ? 'IMAGE' : 'VIDEO') : 'NONE',
                ...mediaPayload
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${creds.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(postBody)
    });

    if (!response.ok) throw new Error(`API Error LinkedIn: ${await response.text()}`);
}


async function uploadMediaToLinkedIn(mediaUrl: string, mediaType: string, accessToken: string, providerUserId: string) {
    const recipe = mediaType === 'image' ? 'urn:li:digitalmediaRecipe:feedshare-image' : 'urn:li:digitalmediaRecipe:feedshare-video';
    
    const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "registerUploadRequest": {
                "recipes": [recipe],
                "owner": `urn:li:person:${providerUserId}`,
                "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}]
            }
        })
    });
    if (!registerResponse.ok) throw new Error(`Error en registrar la pujada: ${await registerResponse.text()}`);
    
    const registerData = await registerResponse.json();
    const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const assetURN = registerData.value.asset;

    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok) throw new Error("No s'ha pogut descarregar el mèdia de Supabase Storage.");
    
    const mediaBlob = await mediaResponse.blob();
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mediaBlob.type },
        body: mediaBlob
    });
    if (!uploadResponse.ok) throw new Error(`Error en pujar el mèdia a LinkedIn: ${await uploadResponse.text()}`);

    return assetURN;
}




// --- FUNCIONS DE PUBLICACIó ---

async function publishToFacebook(creds: Credentials, post: Post) {
    if (!creds.provider_page_id) throw new Error("Falta l'ID de la pàgina de Facebook.");
    const mediaUrls = post.media_url || [];

    if (mediaUrls.length > 1 && post.media_type === 'image') {
        // Lògica per a carrusel de FOTOS
        const attachedMediaIds = await Promise.all(mediaUrls.map(async (url) => {
            const uploadUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/photos?url=${encodeURIComponent(url)}&published=false&access_token=${creds.access_token}`;
            const res = await fetch(uploadUrl, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(JSON.stringify(data.error));
            return { media_fbid: data.id };
        }));

        const body: FacebookBody = {
            message: post.content,
            attached_media: attachedMediaIds,
            access_token: creds.access_token,
        };
        const res = await fetch(`https://graph.facebook.com/v19.0/${creds.provider_page_id}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
    } else {
        // Lògica per a publicació simple (text, 1 foto, 1 vídeo)
        let endpoint = 'feed';
        let body: FacebookBody = {
            message: post.content,
            access_token: creds.access_token
        };

        if (mediaUrls.length === 1) {
            if (post.media_type === 'image') {
                endpoint = 'photos';
                body = { caption: post.content, url: mediaUrls[0], access_token: creds.access_token };
            } else if (post.media_type === 'video') {
                endpoint = 'videos';
                body = { description: post.content, file_url: mediaUrls[0], access_token: creds.access_token };
            }
        }
        
        const res = await fetch(`https://graph.facebook.com/v19.0/${creds.provider_page_id}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
    }
}

async function publishToInstagram(creds: Credentials, post: Post) {
    if (!creds.provider_page_id) throw new Error("Falta l'ID del compte d'Instagram.");
    const mediaUrls = post.media_url || [];
    if (mediaUrls.length === 0) throw new Error("Instagram requereix almenys un element multimèdia.");

    const itemContainerIds = await Promise.all(mediaUrls.map(async (url) => {
        const params = new URLSearchParams({
            access_token: creds.access_token,
            is_carousel_item: (mediaUrls.length > 1).toString()
        });
        if (post.media_type === 'image') {
            params.append('image_url', url);
        } else if (post.media_type === 'video') {
            params.append('video_url', url);
            params.append('media_type', 'VIDEO');
        } else {
            throw new Error(`Tipus de mèdia no compatible amb Instagram: ${post.media_type}`);
        }
        const res = await fetch(`https://graph.facebook.com/v19.0/${creds.provider_page_id}/media?${params.toString()}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(`Error en crear contenidor de mèdia: ${JSON.stringify(data.error)}`);
        return data.id;
    }));
    
    // El 'caption' s'afegeix només al contenidor final, no a cada element.
    const creationId = mediaUrls.length > 1
        ? await createCarouselContainer(creds, itemContainerIds, post.content || '')
        : itemContainerIds[0];

    // Bucle d'espera (polling) per comprovar l'estat del contenidor
    let isReady = false;
    for (let attempts = 0; attempts < 20; attempts++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const statusUrl = `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${creds.access_token}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();
        
        console.log(`[Instagram] Intent ${attempts + 1}: Estat del contenidor ${creationId} - ${statusData.status_code}`);

        if (statusData.status_code === 'FINISHED') {
            isReady = true;
            break;
        }
        if (statusData.status_code === 'ERROR') {
            console.error("[Instagram] Error rebut durant el processament:", statusData);
            throw new Error(`Error en el processament del mèdia per part d'Instagram.`);
        }
    }
    if (!isReady) throw new Error("El contenidor no s'ha processat a temps.");

    // Publicació final
    console.log(`[Instagram] Contenidor ${creationId} llest. Publicant...`);
    const publishUrl = `https://graph.facebook.com/v19.0/${creds.provider_page_id}/media_publish`;
    const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: creds.access_token
    });
    
    // ✅ CORRECCIÓ: S'afegeix el 'caption' aquí per a publicacions d'un sol element.
    if (mediaUrls.length === 1) {
        publishParams.append('caption', post.content || '');
    }

    const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
    if (!publishResponse.ok) throw new Error(`Error en la publicació final d'Instagram: ${JSON.stringify((await publishResponse.json()).error)}`);
    console.log(`[Instagram] Publicat amb èxit.`);
}

async function createCarouselContainer(creds: Credentials, itemIds: string[], caption: string) {
    const params = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: itemIds.join(','),
        caption: caption,
        access_token: creds.access_token
    });
    const res = await fetch(`https://graph.facebook.com/v19.0/${creds.provider_page_id}/media?${params.toString()}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(`Error creant el contenidor de carrusel: ${JSON.stringify(data.error)}`);
    return data.id;
}

export const publishers = {
    'linkedin': publishToLinkedIn,
    'facebook': publishToFacebook,
    'instagram': publishToInstagram,
};