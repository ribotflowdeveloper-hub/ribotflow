// Ubicació: /supabase/functions/social-publisher/_lib/db.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Post, Credentials } from './types.ts';

export async function getScheduledPosts(supabase: SupabaseClient): Promise<Post[]> {
    const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());
    if (error) throw error;
    return data || [];
}

export async function getProviderCredentials(supabase: SupabaseClient, teamId: string, provider: string): Promise<Credentials> {
    const { data, error } = await supabase
        .from('team_credentials')
        .select('access_token, provider_user_id, provider_page_id')
        .eq('team_id', teamId)
        .eq('provider', provider)
        .single();
    if (error) throw new Error(`No s'han trobat credencials per a '${provider}'.`);
    return data;
}

export async function updatePostStatus(supabase: SupabaseClient, postId: number, successCount: number, totalProviders: number): Promise<void> {
    const finalStatus = successCount === totalProviders ? 'published' : successCount > 0 ? 'partial_success' : 'failed';
    await supabase.from('social_posts').update({
        status: finalStatus,
        published_at: new Date().toISOString()
    }).eq('id', postId);
}


export async function createNotification(supabase: SupabaseClient, post: Post, provider: string, success: boolean, errorMessage: string | null): Promise<void> {
    const providerName = provider.replace(/^\w/, (c) => c.toUpperCase());
    const message = success
        ? `✅ Publicació a ${providerName} enviada amb èxit.`
        : `❌ Error en publicar a ${providerName}: ${errorMessage?.substring(0, 100)}...`;

    if (!post.user_id) {
        console.error(`No s'ha pogut crear la notificació per al post ${post.id} perquè no té user_id.`);
        return;
    }

    // ✅ CORRECCIÓ: Eliminem 'team_id' de la inserció.
    const { error } = await supabase.from('notifications').insert({
        user_id: post.user_id,
        message: message,
        type: success ? 'post_published' : 'post_failed'
    });

    if (error) {
        console.error(`[ERROR] No s'ha pogut inserir la notificació per al post ${post.id}:`, error.message);
    }
}