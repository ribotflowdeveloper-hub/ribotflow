import { SupabaseClient } from 'supabase-admin'; // ✅ CORREGIT
import type { Post, Credentials } from './types.ts';
import { decrypt } from './crypto.ts'; // ✅ NOU: Importem la funció de desxifratge

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
    
    // ✅ NOU: Obtenim el secret d'encriptació
    const encryptionSecret = Deno.env.get("ENCRYPTION_SECRET_KEY");
    if (!encryptionSecret) {
      throw new Error("La variable d'entorn ENCRYPTION_SECRET_KEY no està configurada al worker.");
    }

    const { data, error } = await supabase
        .from('team_credentials')
        // ✅ CORREGIT: Seleccionem també el refresh_token per a futures implementacions
        .select('access_token, refresh_token, provider_user_id, provider_page_id') 
        .eq('team_id', teamId)
        .eq('provider', provider)
        .single();
        
    if (error) throw new Error(`No s'han trobat credencials per a '${provider}' a l'equip ${teamId}.`);

    // ✅ NOU: Desxifrem els tokens abans de retornar-los
    try {
      const decryptedAccessToken = await decrypt(data.access_token, encryptionSecret);
      const decryptedRefreshToken = await decrypt(data.refresh_token, encryptionSecret);

      return {
        ...data,
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[CRYPTO] Error desxifrant credencials per a ${provider} (Equip: ${teamId}):`, errorMessage);
      throw new Error(`Error en desxifrar les credencials per a ${provider}.`);
    }
}

export async function updatePostStatus(supabase: SupabaseClient, postId: number, successCount: number, totalProviders: number): Promise<void> {
    const finalStatus = successCount === totalProviders ? 'published' : successCount > 0 ? 'partial_success' : 'failed';
    
    const { error } = await supabase.from('social_posts').update({
        status: finalStatus,
        published_at: new Date().toISOString()
    }).eq('id', postId);

    if (error) {
      console.error(`[DB] Error actualitzant l'estat del post ${postId}:`, error.message);
    }
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
    
    const { error } = await supabase.from('notifications').insert({
        user_id: post.user_id,
        team_id: post.team_id, // ✅ CORREGIT: Les notificacions també haurien de tenir team_id
        message: message,
        type: success ? 'post_published' : 'post_failed'
    });

    if (error) {
        console.error(`[ERROR] No s'ha pogut inserir la notificació per al post ${post.id}:`, error.message);
    }
}