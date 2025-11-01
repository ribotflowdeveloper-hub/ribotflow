// src/app/api/oauth/callback/[provider]/route.ts
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import AES from "crypto-js/aes"; // ✅ NOU: Importem la llibreria d'encriptació

export const dynamic = "force-dynamic";

interface CredentialData {
    user_id: string;
    provider: string;
    access_token: string;
    refresh_token?: string | null;
    expires_at: string | null;
    provider_user_id: string | null;
    provider_page_id?: string | null;
    provider_page_name?: string | null;
}

function decodeJwtPayload(token: string) {
    try {
        const payloadBase64 = token.split(".")[1];
        const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
        const decodedPayload = atob(base64);
        return JSON.parse(decodedPayload);
    } catch (e) {
        console.error("Error decodificant el JWT (id_token):", e);
        return null;
    }
}

type GoogleUserInfo = {
    id: string;
    email: string;
    verified_email: boolean;
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> } // ✅ Corregit
) {
    const { provider } = await params; // ✅ Corregit
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookieStore = cookies();
    const savedState = (await cookieStore).get("oauth_state")?.value;
    (await cookieStore).delete("oauth_state");

    if (!code || !state || state !== savedState) {
        return NextResponse.redirect(
            new URL("/settings/integrations?error=auth_failed", request.url),
        );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    try {
        // ✅ NOU: Obtenim la clau secreta, igual que a 'actions.ts'
        const secretKey = process.env.ENCRYPTION_SECRET_KEY;
        if (!secretKey) {
            throw new Error("La clau d'encriptació (ENCRYPTION_SECRET_KEY) no està configurada al servidor.");
        }

        let tokenUrl = "";
        const body = new URLSearchParams();
        const redirectUri =
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/${provider}`;

        switch (provider) {
            case "google_gmail": 
            case "google_calendar": 
                tokenUrl = "https://oauth2.googleapis.com/token";
                body.append("client_id", process.env.GOOGLE_CLIENT_ID!);
                body.append("client_secret", process.env.GOOGLE_CLIENT_SECRET!);
                body.append("code", code);
                body.append("grant_type", "authorization_code");
                body.append("redirect_uri", redirectUri);
                break;
            // ... (els teus altres casos: linkedin, microsoft, facebook es queden igual) ...
            case "linkedin":
                tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
                body.append("grant_type", "authorization_code");
                body.append("code", code);
                body.append("redirect_uri", redirectUri);
                body.append("client_id", process.env.LINKEDIN_CLIENT_ID!);
                body.append(
                    "client_secret",
                    process.env.LINKEDIN_CLIENT_SECRET!,
                );
                break;
            case "microsoft":
                tokenUrl =
                    "https://login.microsoftonline.com/common/oauth2/v2.0/token";
                body.append("client_id", process.env.AZURE_CLIENT_ID!);
                body.append("client_secret", process.env.AZURE_CLIENT_SECRET!);
                body.append(
                    "scope",
                    "openid email offline_access User.Read Mail.Read Mail.Send",
                );
                body.append("code", code);
                body.append("redirect_uri", redirectUri);
                body.append("grant_type", "authorization_code");
                break;
            case "facebook":
                tokenUrl =
                    "https://graph.facebook.com/v19.0/oauth/access_token";
                body.append("client_id", process.env.FACEBOOK_CLIENT_ID!);
                body.append(
                    "client_secret",
                    process.env.FACEBOOK_CLIENT_SECRET!,
                );
                body.append("redirect_uri", redirectUri);
                body.append("code", code);
                break;
        }

        const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        if (!tokenResponse.ok) {
            throw new Error(
                `Error en obtenir el token de ${provider}: ${await tokenResponse
                    .text()}`,
            );
        }
        const tokens = await tokenResponse.json();

        const isTeamIntegration = ["linkedin", "facebook", "instagram"]
            .includes(provider);
        const isPersonalIntegration = [
            "google_gmail",
            "google_calendar",
            "microsoft",
        ].includes(provider);
        const supabaseAdmin = createAdminClient();
        const activeTeamId = user.app_metadata?.active_team_id;

        if (!activeTeamId) {
            throw new Error(
                "S'ha de seleccionar un equip actiu abans de connectar una integració.",
            );
        }

        const baseDataToUpsert: CredentialData = {
            user_id: user.id,
            provider: provider,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            expires_at: tokens.expires_in
                ? new Date(Date.now() + (tokens.expires_in * 1000))
                    .toISOString()
                : null,
            provider_user_id: null,
        };

        if (provider === "google_gmail" || provider === "google_calendar") {
            const userInfoResponse = await fetch(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                },
            );
            if (!userInfoResponse.ok) {
                throw new Error("No s'ha pogut obtenir la info de l'usuari de Google.");
            }
            const userInfo: GoogleUserInfo = await userInfoResponse.json();
            baseDataToUpsert.provider_user_id = userInfo.email; 
        } else if (provider === "microsoft" || provider === "linkedin") {
            baseDataToUpsert.provider_user_id = tokens.id_token
                ? decodeJwtPayload(tokens.id_token)?.sub
                : null;
        }

        if (isTeamIntegration) {
            // ... (La teva lògica de 'team_credentials' es queda igual)
        } else if (isPersonalIntegration) {
            
            // ✅ NOU PLA: Encriptem aquí, al servidor, amb AES
            const encrypted_access_token = AES.encrypt(baseDataToUpsert.access_token, secretKey).toString();
            const encrypted_refresh_token = baseDataToUpsert.refresh_token
                ? AES.encrypt(baseDataToUpsert.refresh_token, secretKey).toString()
                : null;

            // ✅ TORNEM A L'UPSERT SIMPLE, com feies amb 'custom_email'
            const { error: dbError } = await supabaseAdmin.from("user_credentials").upsert({
                user_id: baseDataToUpsert.user_id,
                team_id: activeTeamId,
                provider: baseDataToUpsert.provider,
                access_token: encrypted_access_token, // Guardem el token encriptat
                refresh_token: encrypted_refresh_token, // Guardem el token encriptat
                expires_at: baseDataToUpsert.expires_at,
                provider_user_id: baseDataToUpsert.provider_user_id,
                // Assegurem-nos que les altres columnes no rellevants siguin null
                config: null,
                encrypted_password: null,
            }, { onConflict: 'user_id, provider' }); // Ajusta 'onConflict' a la teva clau única

            if (dbError) {
                console.error(`Error en l'upsert encriptat per a ${provider}:`, dbError);
                throw dbError;
            }

            console.log(
                `Credencials PERSONALS (${provider}) desades (ENCRIPTADES amb JS) per a l'usuari ${user.id} a l'equip ${activeTeamId}`,
            );
        }
    } catch (error) {
        console.error(`Error en el callback de ${provider}:`, error);
        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown error";
        return NextResponse.redirect(
            new URL(
                `/settings/integrations?error=callback_failed&message=${encodeURIComponent(errorMessage)}`,
                request.url,
            ),
        );
    }

    return NextResponse.redirect(
        new URL("/settings/integrations?success=true", request.url),
    );
}