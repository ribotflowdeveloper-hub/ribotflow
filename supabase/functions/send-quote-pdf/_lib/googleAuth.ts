// supabase/functions/send-quote-pdf/_lib/googleAuth.ts

import { SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { type AuthData, type GoogleTokenResponse } from "./types.ts";

/**
 * Obté l'usuari autenticat a partir de la capçalera Authorization.
 */
async function getAuthenticatedUser(authHeader: string | null): Promise<{ id: string; email?: string }> {
  if (!authHeader) throw new Error("Falta la capçalera 'Authorization'.");

  const userSupabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: { user }, error } = await userSupabase.auth.getUser();

  if (error) throw new Error(`Error obtenint usuari del token: ${error.message}`);
  if (!user) throw new Error("Usuari no autenticat amb el token proporcionat.");
  
  console.log("User authenticated via JWT:", user.id);
  return { id: user.id, email: user.email }; // Retorna l'email també, pot ser útil
}

/**
 * Obté un nou Access Token de Google utilitzant el Refresh Token de l'usuari.
 */
async function refreshGoogleAccessToken(supabaseAdmin: SupabaseClient, userId: string): Promise<string> {
  // Obtenir el refresh_token
  const { data: creds, error: credsError } = await supabaseAdmin
    .from('user_credentials')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (credsError) throw new Error(`Error obtenint credencials: ${credsError.message}`);
  if (!creds?.refresh_token) throw new Error("No s'han trobat les credencials de Google (refresh token) per aquest usuari. Si us plau, connecta el teu compte a 'Integracions'.");
  console.log("Google refresh token found for user.");

  // Intercanviar per access_token
  let tokenResponseText = "Token response not read yet";
  let tokenResponseStatus = 0;
  let tokens: GoogleTokenResponse | null = null;
  try {
    console.log("Requesting Google Access Token...");
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    tokenResponseStatus = tokenResponse.status;
    tokenResponseText = await tokenResponse.text();
    console.log("Google Token Response Status:", tokenResponseStatus);
    console.log("Google Token Response Body:", tokenResponseText);

    if (!tokenResponse.ok) {
      throw new Error(`Google Token request failed with status ${tokenResponseStatus}`);
    }
    
    tokens = JSON.parse(tokenResponseText);

  } catch (tokenErr) {
    console.error("Error during Google Token request/parsing:", tokenErr);
    const errMsg = typeof tokenErr === "object" && tokenErr !== null && "message" in tokenErr ? (tokenErr as { message: string }).message : String(tokenErr);
    throw new Error(`Failed to get/parse Google token: ${errMsg}. Raw response (${tokenResponseStatus}): ${tokenResponseText}`);
  }

  if (!tokens?.access_token) throw new Error(`No s'ha pogut obtenir l'access token de Google del JSON parsejat. Resposta original: ${tokenResponseText}`);
  
  console.log("Google Access Token obtained successfully.");
  return tokens.access_token;
}

/**
 * Orquestra l'obtenció de l'usuari i el seu Access Token de Google.
 */
export async function getGoogleAuthData(supabaseAdmin: SupabaseClient, authHeader: string | null): Promise<AuthData> {
    const user = await getAuthenticatedUser(authHeader);
    const accessToken = await refreshGoogleAccessToken(supabaseAdmin, user.id);
    return { user, accessToken };
}