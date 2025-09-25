import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

/**
 * Funció auxiliar per a refrescar un token d'OAuth 2.0 (per a Google i Microsoft).
 */
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

/**
 * Edge Function principal que s'executa periòdicament via Cron Job.
 * Gestiona la renovació de tokens que estan a punt de caducar i neteja els que ja han caducat.
 */
serve(async (req) => {
    // Comprovació de seguretat per a assegurar que només Supabase Cron pot cridar aquesta funció
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
        // --- LÒGICA 1: RENOVACIÓ AUTOMÀTICA DE TOKENS AMB 'refresh_token' ---
        const renewalThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Renovem si caduquen en menys de 7 dies

        // Renovem credencials personals (Google, Microsoft)
        const { data: userTokensToRenew } = await supabaseAdmin.from('user_credentials').select('*').in('provider', ['google', 'microsoft']).not('refresh_token', 'is', null).lt('expires_at', renewalThreshold.toISOString());
        for (const token of (userTokensToRenew || [])) {
            try {
                const newTokens = await refreshToken(token.provider, token.refresh_token!);
                await supabaseAdmin.from('user_credentials').update({
                    access_token: newTokens.access_token,
                    refresh_token: newTokens.refresh_token || token.refresh_token, // Google pot retornar un nou refresh_token
                    expires_at: new Date(Date.now() + (newTokens.expires_in - 300) * 1000),
                }).eq('id', token.id);
                logs.push(`Token PERSONAL de ${token.provider} (usuari ${token.user_id}) renovat.`);
            } catch (e) { logs.push(`ERROR renovant token personal ${token.id}: ${e.message}`); }
        }

        // Renovem credencials d'equip (ex: Facebook si tingués refresh_token)
        const { data: teamTokensToRenew } = await supabaseAdmin.from('team_credentials').select('*').not('refresh_token', 'is', null).lt('expires_at', renewalThreshold.toISOString());
        for (const token of (teamTokensToRenew || [])) {
            try {
                const newTokens = await refreshToken(token.provider, token.refresh_token!);
                await supabaseAdmin.from('team_credentials').update({
                    access_token: newTokens.access_token,
                    expires_at: new Date(Date.now() + (newTokens.expires_in - 300) * 1000),
                }).eq('id', token.id);
                logs.push(`Token D'EQUIP de ${token.provider} (equip ${token.team_id}) renovat.`);
            } catch (e) { logs.push(`ERROR renovant token d'equip ${token.id}: ${e.message}`); }
        }

        // --- LÒGICA 2: NETEJA DE TOKENS CADUCATS SENSE 'refresh_token' (LinkedIn, etc.) ---
        
        // Netegem credencials personals caducades
        const { data: userTokensToExpire } = await supabaseAdmin.from('user_credentials').select('*').is('refresh_token', null).lt('expires_at', now.toISOString());
        for (const token of (userTokensToExpire || [])) {
            await supabaseAdmin.from('user_credentials').delete().eq('id', token.id);
            await supabaseAdmin.from('notifications').insert({
                user_id: token.user_id,
                message: `La teva integració personal amb ${token.provider.replace('_oidc', '')} ha caducat. Si us plau, torna a connectar-la.`,
                type: 'integration_expired'
            });
            logs.push(`Token PERSONAL de ${token.provider} (usuari ${token.user_id}) eliminat i notificació creada.`);
        }

        // Netegem credencials d'equip caducades
        const { data: teamTokensToExpire } = await supabaseAdmin.from('team_credentials').select('*').is('refresh_token', null).lt('expires_at', now.toISOString());
        for (const token of (teamTokensToExpire || [])) {
            await supabaseAdmin.from('team_credentials').delete().eq('id', token.id);
            
            // Notifiquem al propietari de l'equip
            const { data: team } = await supabaseAdmin.from('teams').select('owner_id').eq('id', token.team_id).single();
            if (team) {
                await supabaseAdmin.from('notifications').insert({
                    user_id: team.owner_id,
                    message: `La integració de l'equip amb ${token.provider} ha caducat. Un administrador ha de tornar a connectar-la.`,
                    type: 'integration_expired'
                });
                logs.push(`Token D'EQUIP de ${token.provider} (equip ${token.team_id}) eliminat i notificació creada per a l'owner ${team.owner_id}.`);
            }
        }
        
        console.log("Execució de token-manager finalitzada.", logs);
        return new Response(JSON.stringify({ status: 'ok', logs }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Error fatal a la funció token-manager:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});