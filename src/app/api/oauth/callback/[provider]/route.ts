// ✅ Aquesta ruta gestiona el callback OAuth i desa els tokens a Supabase.
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// ✅ AFEGEIX AQUESTA INTERFACE QUE FALTAVA
// Això li diu a TypeScript com és un objecte de credencials.
interface CredentialData {
    provider: string;
    access_token: string;
    refresh_token?: string | null;
    expires_at: string | null;
    provider_user_id: string | null;
}
// ✅ NOU: Funció auxiliar per a decodificar el payload d'un JWT.
// No verifica la signatura, només llegeix la informació pública del "DNI digital".
// Funció auxiliar per a decodificar el payload d'un JWT.
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
type RouteParams = Promise<{ provider: string }>;

export async function GET(
    request: Request,
    { params }: { params: RouteParams }
) {


    // ✅ PAS 1: Resolem la promesa dels paràmetres amb 'await'
    const { provider } = await params;

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // PAS 2: Resolem la promesa de les cookies amb 'await'
    const cookieStore = await cookies();
    const savedState = cookieStore.get("oauth_state")?.value;
    cookieStore.delete("oauth_state");

    if (!code || !state || state !== savedState) {
        return NextResponse.redirect(new URL("/settings/integrations?error=auth_failed", request.url));
    }

    // PAS 3: Creem el client passant les cookies ja resoltes
    const supabase = createClient(cookies())
        ;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        let tokenUrl = '';
        const body = new URLSearchParams();
        const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/${provider}`;

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
        }

        const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        if (!tokenResponse.ok) throw new Error(`Error en obtenir el token de ${provider}: ${await tokenResponse.text()}`);
        const tokens = await tokenResponse.json();

        // --- ✅ AQUESTA ÉS LA LÒGICA D'EQUIPS QUE FALTAVA ---

        const supabaseAdmin = createAdminClient();

        // 1. Determinem si la integració és per a l'equip o personal.
        const isTeamIntegration = ['linkedin', 'facebook', 'instagram'].includes(provider);

        // 2. Obtenim l'ID de l'equip actiu del token de l'usuari.
        const activeTeamId = user.app_metadata?.active_team_id;

        // 3. Si és una integració d'equip, exigim que hi hagi un equip actiu.
        if (isTeamIntegration && !activeTeamId) {
            throw new Error("S'ha de seleccionar un equip actiu abans de connectar una integració d'equip.");
        }

        // 4. Preparem les dades comunes per a desar.
        const dataToUpsert: CredentialData = {
            provider: provider,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            expires_at: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in - 300) * 1000).toISOString() : null,
            provider_user_id: tokens.id_token ? decodeJwtPayload(tokens.id_token)?.sub : null,
        };

        // 5. Decidim a quina taula desar les credencials.
        if (isTeamIntegration) {
            // Si és LinkedIn, desarem a 'team_credentials'.
            await supabaseAdmin
                .from('team_credentials')
                .upsert({
                    ...dataToUpsert,
                    team_id: activeTeamId,
                    user_id: user.id // Guardem qui va fer l'autorització
                }, {
                    onConflict: 'team_id, provider'
                })
                .throwOnError();
            console.log(`Credencials d'EQUIP (${provider}) desades per a l'equip ${activeTeamId}`);
        } else {
            // Si és una integració personal (Google, etc.), desarem a 'user_credentials'.
            await supabaseAdmin
                .from('user_credentials')
                .upsert({
                    ...dataToUpsert,
                    team_id: activeTeamId,

                    user_id: user.id
                }, {
                    onConflict: 'user_id, provider'
                })
                .throwOnError();
            console.log(`Credencials PERSONALS (${provider}) desades per a l'usuari ${user.id}`);
        }

    } catch (error) {
        console.error(`Error en el callback de ${provider}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconegut';
        return NextResponse.redirect(new URL(`/settings/integrations?error=callback_failed&message=${encodeURIComponent(errorMessage)}`, request.url));
    }

    return NextResponse.redirect(new URL('/settings/integrations?success=true', request.url));
}