import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Interfície per a les dades que desarem a la base de dades
interface CredentialData {
    user_id: string;
    provider: string;
    access_token: string;
    refresh_token?: string | null;
    expires_at: string | null;
    provider_user_id: string | null;
    // Propietats opcionals per a les pàgines de Meta
    provider_page_id?: string | null;
    provider_page_name?: string | null;
}

// Funció auxiliar per a decodificar el payload d'un JWT (id_token)
function decodeJwtPayload(token: string) {
    try {
        const payloadBase64 = token.split('.')[1];
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = atob(base64);
        return JSON.parse(decodedPayload);
    } catch (e) {
        console.error("Error decodificant el JWT (id_token):", e);
        return null;
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const { provider } = await params;
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookieStore = cookies();
    const savedState = (await cookieStore).get("oauth_state")?.value;
    (await cookieStore).delete("oauth_state");

    if (!code || !state || state !== savedState) {
        return NextResponse.redirect(new URL("/settings/integrations?error=auth_failed", request.url));
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    try {
        let tokenUrl = '';
        const body = new URLSearchParams();
        const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/${provider}`;

        // La teva lògica 'switch' per a construir el body és correcta
        switch (provider) {
            case 'google':
                tokenUrl = 'https://oauth2.googleapis.com/token';
                body.append('client_id', process.env.GOOGLE_CLIENT_ID!);
                body.append('client_secret', process.env.GOOGLE_CLIENT_SECRET!);
                body.append('code', code);
                body.append('grant_type', 'authorization_code');
                body.append('redirect_uri', redirectUri);
                break;

            case 'linkedin':
                tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
                body.append('grant_type', 'authorization_code');
                body.append('code', code);
                body.append('redirect_uri', redirectUri);
                body.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
                body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);
                break;

            case 'microsoft':
                tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
                body.append('client_id', process.env.AZURE_CLIENT_ID!);
                body.append('client_secret', process.env.AZURE_CLIENT_SECRET!);
                body.append('scope', 'openid email offline_access User.Read Mail.Read Mail.Send');
                body.append('code', code);
                body.append('redirect_uri', redirectUri);
                body.append('grant_type', 'authorization_code');
                break;
            // ✅ NOU: AFEGIM EL CAS PER A FACEBOOK
            case 'facebook':
                tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
                body.append('client_id', process.env.FACEBOOK_CLIENT_ID!);
                body.append('client_secret', process.env.FACEBOOK_CLIENT_SECRET!);
                body.append('redirect_uri', redirectUri);
                body.append('code', code);
                break;
        }

        const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        if (!tokenResponse.ok) throw new Error(`Error en obtenir el token de ${provider}: ${await tokenResponse.text()}`);
        const tokens = await tokenResponse.json();

        // --- ARQUITECTURA HÍBRIDA FINAL ---
        const isTeamIntegration = ['linkedin', 'facebook', 'instagram'].includes(provider);
        const isPersonalIntegration = ['google', 'microsoft'].includes(provider);
        const supabaseAdmin = createAdminClient();
        const activeTeamId = user.app_metadata?.active_team_id;

        if (!activeTeamId) {
            throw new Error("S'ha de seleccionar un equip actiu abans de connectar una integració.");
        }

        const baseDataToUpsert: CredentialData = {
            user_id: user.id,
            provider: provider,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            expires_at: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)).toISOString() : null,
            provider_user_id: tokens.id_token ? decodeJwtPayload(tokens.id_token)?.sub : null,
        };

        if (isTeamIntegration) {
            // ✅ LÒGICA MILLORADA PER A META (FACEBOOK + INSTAGRAM)
            if (provider === 'facebook') {
                // 1. Busquem la primera pàgina de Facebook que gestiona l'usuari
                const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${tokens.access_token}`);
                const pagesData = await pagesRes.json();
                const page = pagesData.data?.[0];
                if (!page) throw new Error("No s'ha trobat cap pàgina de Facebook per a gestionar.");

                // Preparem les dades específiques de la pàgina de Facebook
                const facebookData = { ...baseDataToUpsert, provider_page_id: page.id, provider_page_name: page.name, access_token: page.access_token };
                await supabaseAdmin.from('team_credentials').upsert({ ...facebookData, team_id: activeTeamId }, { onConflict: 'team_id, provider' });
                console.log(`Credencial de FACEBOOK desada per a la pàgina ${page.name}`);

                // 2. Busquem si aquesta pàgina té un compte d'Instagram de negoci associat
                const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{name}&access_token=${page.access_token}`);
                const igData = await igRes.json();
                const instagramAccount = igData.instagram_business_account;

                // ✅ VERIFICACIÓ EXPLÍCITA
                // Creem les dues credencials i les desem en paral·lel
                const facebookCredential = { ...baseDataToUpsert, provider: 'facebook', team_id: activeTeamId, provider_page_id: page.id, provider_page_name: page.name, access_token: page.access_token };

                const queries = [
                    supabaseAdmin.from('team_credentials').upsert(facebookCredential, { onConflict: 'team_id, provider' })
                ];

                if (instagramAccount) {
                    const instagramCredential = { ...baseDataToUpsert, provider: 'instagram', team_id: activeTeamId, provider_page_id: instagramAccount.id, provider_page_name: instagramAccount.name, access_token: page.access_token };
                    queries.push(supabaseAdmin.from('team_credentials').upsert(instagramCredential, { onConflict: 'team_id, provider' }));
                }
                
                const results = await Promise.all(queries);
                // Comprovem si alguna de les operacions ha donat error
                const dbError = results.find(res => res.error);
                if (dbError) throw dbError.error;
            
            } else { // Per a LinkedIn
                await supabaseAdmin.from('team_credentials').upsert({ ...baseDataToUpsert, team_id: activeTeamId }, { onConflict: 'team_id, provider' });
            }
        } else if (isPersonalIntegration) {
            // Per a Google/Outlook, guardem a 'user_credentials' amb el team_id associat
            await supabaseAdmin.from('user_credentials').upsert({ ...baseDataToUpsert, team_id: activeTeamId }, { onConflict: 'user_id, provider, team_id' });
            console.log(`Credencials PERSONALS (${provider}) desades per a l'usuari ${user.id} a l'equip ${activeTeamId}`);
        }

    } catch (error) {
        console.error(`Error en el callback de ${provider}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.redirect(new URL(`/settings/integrations?error=callback_failed&message=${encodeURIComponent(errorMessage)}`, request.url));
    }

    return NextResponse.redirect(new URL('/settings/integrations?success=true', request.url));
}