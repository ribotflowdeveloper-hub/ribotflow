// ✅ Aquesta ruta gestiona el callback OAuth i desa els tokens a Supabase.
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  const supabase = createClient();

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

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });
    
    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Error obtenint el token de ${provider}. Status: ${response.status}. Resposta:`, responseText);
      throw new Error(`Failed to fetch token from ${provider}`);
    }
    
    const tokens = JSON.parse(responseText);
    // ✅ NOU CONSOLE.LOG
    console.log(`Resposta COMPLETA de ${provider}:`, tokens);
    
    const { access_token, refresh_token, expires_in, id_token } = tokens;
    
    let provider_user_id = null;
    if (id_token) {
      // ✅ NOU CONSOLE.LOG
      console.log("id_token rebut, intentant decodificar...");
      const payload = decodeJwtPayload(id_token);
      // ✅ NOU CONSOLE.LOG
      console.log("Payload del id_token decodificat:", payload);
      if (payload && payload.sub) {
        provider_user_id = payload.sub;
        console.log(`ID d'usuari de ${provider} extret amb èxit: ${provider_user_id}`);
      } else {
        // ✅ NOU CONSOLE.LOG
        console.warn("El payload del id_token no conté el camp 'sub'.");
      }
    } else {
      // ✅ NOU CONSOLE.LOG
      console.warn(`No s'ha rebut un id_token de ${provider}. No es pot extreure el provider_user_id.`);
    }

    const expires_at = expires_in ? new Date(Date.now() + (expires_in - 300) * 1000) : null;
    
    const dataToUpsert = {
      user_id: user.id,
      provider: provider === 'linkedin' ? 'linkedin_oidc' : provider,
      access_token: access_token,
      refresh_token: refresh_token,
      expires_at: expires_at,
      provider_user_id: provider_user_id,
    };

    // ✅ NOU CONSOLE.LOG
    console.log("Dades que s'enviaran a la taula 'user_credentials':", dataToUpsert);

    const { error } = await supabase.from('user_credentials').upsert(dataToUpsert, { onConflict: 'user_id, provider' });
    
    if (error) {
        // ✅ NOU CONSOLE.LOG
        console.error("Error de Supabase en fer l'upsert:", error);
        throw error;
    }
    console.log("Dades guardades correctament a Supabase.");
    
  } catch (error) {
    console.error(`Error en el callback de ${provider}:`, error);
    return NextResponse.redirect(new URL('/settings/integrations?error=callback_failed', request.url));
  }

  return NextResponse.redirect(new URL('/settings/integrations?success=true', request.url));
}
