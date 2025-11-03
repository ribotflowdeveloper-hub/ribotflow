import { SupabaseClient } from 'supabase-admin'; // ✅ CORREGIT
import type { Post } from './types.ts';
import { getProviderCredentials, updatePostStatus, createNotification } from './db.ts';
import { publishers } from './publishers.ts';

export async function processPost(post: Post, supabaseAdmin: SupabaseClient): Promise<void> {
    if (!post.team_id) {
        console.error(`[ERROR] [Post ID: ${post.id}] La publicació no té un equip assignat. Avortant.`);
        await updatePostStatus(supabaseAdmin, post.id, 0, post.provider.length);
        await createNotification(supabaseAdmin, post, 'system', false, "La publicació no té un equip assignat.");
        return;
    }

    let successCount = 0;
    for (const provider of post.provider) {
        try {
            // Ara 'creds' contindrà els tokens DESXIFRATS
            const creds = await getProviderCredentials(supabaseAdmin, post.team_id, provider);
            console.log(`[Post ID: ${post.id}] Publicant a '${provider}'...`);
            
            const publisher = publishers[provider as keyof typeof publishers]; // Tipat més segur

            if (publisher) {
                // Aquí és on es podria gestionar el refresc del token si fos necessari
                // (p.ex. si 'creds.access_token' ha caducat i tenim 'creds.refresh_token')
                // De moment, l'enviem directament.
                
                await publisher(creds, post);
                
                await createNotification(supabaseAdmin, post, provider, true, null); 
                console.log(`[Post ID: ${post.id}] Publicat amb èxit a '${provider}'.`);
                successCount++;
            } else {
                throw new Error(`El proveïdor '${provider}' no és compatible.`);
            }
        } catch (e) {
            const errorMessage = (e instanceof Error) ? e.message : String(e);
            console.error(`[ERROR] [Post ID: ${post.id}] Error publicant a '${provider}':`, errorMessage);
            await createNotification(supabaseAdmin, post, provider, false, errorMessage);
        }
    }

    await updatePostStatus(supabaseAdmin, post.id, successCount, post.provider.length);
}