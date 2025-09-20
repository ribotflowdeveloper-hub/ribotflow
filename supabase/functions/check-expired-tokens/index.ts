import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Aquesta funció s'executarà automàticament (Cron Job).
serve(async (req) => {
  // Comprova que la petició vingui de Supabase Cron
  const authHeader = req.headers.get('Authorization')!;
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const logs: string[] = [];

  try {
    // --- LÒGICA 1: RENOVACIÓ AUTOMÀTICA (Google & Microsoft) ---
    const renewalThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dies a partir d'ara
    
    const { data: tokensToRenew, error: renewError } = await supabaseAdmin
      .from('user_credentials')
      .select('*')
      .in('provider', ['google', 'microsoft'])
      .not('refresh_token', 'is', null)
      .lt('expires_at', renewalThreshold.toISOString());

    if (renewError) throw new Error(`Error buscant tokens per a renovar: ${renewError.message}`);

    if (tokensToRenew && tokensToRenew.length > 0) {
      logs.push(`S'han trobat ${tokensToRenew.length} tokens per a renovar (Google/Microsoft).`);
      for (const token of tokensToRenew) {
        try {
          const newTokens = await refreshToken(token.provider, token.refresh_token!);
          
          await supabaseAdmin
            .from('user_credentials')
            .update({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token || token.refresh_token,
              expires_at: new Date(Date.now() + (newTokens.expires_in - 300) * 1000),
            })
            .eq('id', token.id);
          
          logs.push(`Token per a ${token.provider} de l'usuari ${token.user_id} renovat amb èxit.`);
        } catch (e) {
          logs.push(`Error en renovar el token de ${token.provider} per a l'usuari ${token.user_id}: ${e.message}`);
        }
      }
    } else {
      logs.push("No s'han trobat tokens per a renovar.");
    }

    // --- LÒGICA 2: NETEJA DE CADUCATS (LinkedIn i altres sense refresh_token) ---
    const { data: tokensToExpire, error: expireError } = await supabaseAdmin
      .from('user_credentials')
      .select('*')
      .is('refresh_token', null)
      .lt('expires_at', now.toISOString());

    if (expireError) throw new Error(`Error buscant tokens caducats: ${expireError.message}`);

    if (tokensToExpire && tokensToExpire.length > 0) {
      logs.push(`S'han trobat ${tokensToExpire.length} tokens caducats (LinkedIn).`);
      for (const token of tokensToExpire) {
        await supabaseAdmin.from('user_credentials').delete().eq('id', token.id);
        
        await supabaseAdmin.from('notifications').insert({
          user_id: token.user_id,
          message: `La teva integració amb ${token.provider.replace('_oidc', '')} ha caducat. Si us plau, torna a connectar-la.`,
          type: 'integration_expired'
        });
        
        logs.push(`Token de ${token.provider} de l'usuari ${token.user_id} eliminat i notificació creada.`);
      }
    } else {
      logs.push("No s'han trobat tokens caducats per a eliminar.");
    }
    
    return new Response(JSON.stringify({ status: 'ok', logs }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Funció auxiliar per a refrescar un token
async function refreshToken(provider: string, refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number; }> {
  let tokenUrl = '';
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  if (provider === 'google') {
    tokenUrl = 'https://oauth2.googleapis.com/token';
    body.append('client_id', Deno.env.get('GOOGLE_CLIENT_ID')!);
    body.append('client_secret', Deno.env.get('GOOGLE_CLIENT_SECRET')!);
  } else if (provider === 'microsoft') {
    tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    body.append('client_id', Deno.env.get('AZURE_CLIENT_ID')!);
    body.append('client_secret', Deno.env.get('AZURE_CLIENT_SECRET')!);
  } else {
    throw new Error(`El proveïdor ${provider} no suporta la renovació de token.`);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error de l'API de ${provider}: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}