// Ubicació: /supabase/functions/social-publisher/_lib/processPost.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Post } from './types.ts';
import { getProviderCredentials, updatePostStatus, createNotification } from './db.ts';
import { publishers } from './publishers.ts';

export async function processPost(post: Post, supabaseAdmin: SupabaseClient): Promise<void> {
    if (!post.team_id) {
        await createNotification(supabaseAdmin, post, 'system', false, "La publicació no té un equip assignat.");
        return;
    }

    let successCount = 0;
    for (const provider of post.provider) {
        try {
            const creds = await getProviderCredentials(supabaseAdmin, post.team_id, provider);
            console.log(`[Post ID: ${post.id}] Publicant a '${provider}'...`);
            
            const publisher = publishers[provider];

            if (publisher) {
                await publisher(creds, post);
                await createNotification(supabaseAdmin, post, provider, true, null); // ✅ Notificació d'èxit
                console.log(`[Post ID: ${post.id}] Publicat amb èxit a '${provider}'.`);
                successCount++;
            } else {
                throw new Error(`El proveïdor '${provider}' no és compatible.`);
            }
        } catch (e) {
            console.error(`[ERROR] [Post ID: ${post.id}] Error publicant a '${provider}':`, e.message);
            // ✅ CORRECCIÓ: Assegurem que la notificació d'error es crea aquí
            await createNotification(supabaseAdmin, post, provider, false, e.message);
        }
    }

    await updatePostStatus(supabaseAdmin, post.id, successCount, post.provider.length);
}