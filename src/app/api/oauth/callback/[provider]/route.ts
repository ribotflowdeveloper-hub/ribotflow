import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// ✅ NOU: Importem la nostra nova funció de xifratge ràpida
import { encryptToken } from "@/lib/utils/crypto";

export const dynamic = "force-dynamic";

// Interfície base per a les dades.
// Nota: els tokens aquí NO van xifrats encara.
interface CredentialData {
  user_id: string;
  team_id: string; // Afegim team_id aquí per tenir-lo sempre
  provider: string;
  access_token: string; // Token en text pla de l'API
  refresh_token?: string | null; // Token en text pla de l'API
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
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
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
    // ✅ NOU: Utilitzem el nom de variable consistent amb el worker
    const encryptionSecret = process.env.ENCRYPTION_SECRET_KEY;
    if (!encryptionSecret) {
      throw new Error("La clau d'encriptació (ENCRYPTION_SECRET_KEY) no està configurada al servidor.");
    }

    let tokenUrl = "";
    const body = new URLSearchParams();
    const redirectUri =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/${provider}`;

    // ... (El teu switch(provider) per omplir 'body' i 'tokenUrl' es queda exactament igual)
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

    // ✅ NOU: Reintroduïm les teves variables de control
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

    // Preparem les dades base amb els tokens EN TEXT PLA
    const baseDataToUpsert: CredentialData = {
      user_id: user.id,
      team_id: activeTeamId,
      provider: provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + (tokens.expires_in * 1000))
          .toISOString()
        : null,
      provider_user_id: null,
    };

    // Obtenim el 'provider_user_id' (email, etc.)
    if (provider === "google_gmail" || provider === "google_calendar") {
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` }, // Fem servir el token pla original
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

    // ✅ NOU: Lògica de xifratge i desament separada
    
    // Xifrem els tokens ABANS de desar-los
    const encrypted_access_token = await encryptToken(
      baseDataToUpsert.access_token,
      encryptionSecret,
    );
    const encrypted_refresh_token = baseDataToUpsert.refresh_token
      ? await encryptToken(baseDataToUpsert.refresh_token, encryptionSecret)
      : null;

    if (isTeamIntegration) {
      // ✅ LÒGICA DE RRSS: Inserim a 'team_credentials'
      const { error: dbError } = await supabaseAdmin.from("team_credentials").upsert({
          team_id: baseDataToUpsert.team_id,
          provider: baseDataToUpsert.provider,
          access_token: encrypted_access_token,
          refresh_token: encrypted_refresh_token,
          expires_at: baseDataToUpsert.expires_at,
          // ... altres camps específics de team_credentials
        }, { onConflict: 'team_id, provider' }); // Assegura't de la teva clau 'onConflict'

      if (dbError) throw dbError;
      console.log(`Credencials D'EQUIP (${provider}) desades (ENCRIPTADES amb Subtle) a l'equip ${activeTeamId}`);

    } else if (isPersonalIntegration) {
      // ✅ LÒGICA PERSONAL: Inserim a 'user_credentials'
      const { error: dbError } = await supabaseAdmin.from("user_credentials").upsert({
          user_id: baseDataToUpsert.user_id,
          team_id: baseDataToUpsert.team_id,
          provider: baseDataToUpsert.provider,
          access_token: encrypted_access_token,
          refresh_token: encrypted_refresh_token,
          expires_at: baseDataToUpsert.expires_at,
          provider_user_id: baseDataToUpsert.provider_user_id,
          config: null,
          encrypted_password: null,
        }, { onConflict: 'user_id, provider' }); // Assegura't de la teva clau 'onConflict'

      if (dbError) throw dbError;
      console.log(`Credencials PERSONALS (${provider}) desades (ENCRIPTADES amb Subtle) per a l'usuari ${user.id}`);
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