// src/lib/google-api.ts (o on vulguis)
"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import AES from 'crypto-js/aes';
import CryptoJS from 'crypto-js'; // Importa tot CryptoJS per accedir a enc.Utf8

// Tipus per a la fila de la BD (amb dades encriptades)
type EncryptedCredential = {
  refresh_token: string | null;
  access_token: string;
  expires_at: string; // ISO string
  provider_user_id: string;
  team_id: string | null;
};

// Tipus per a la resposta de refresc de Google
type GoogleRefreshResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: "Bearer";
};

/**
 * Obté un Access Token vàlid per a Google Calendar.
 * Si el token actual ha caducat, utilitza el refresh_token per obtenir-ne un de nou
 * i l'actualitza a la base de dades.
 */
export async function getValidGoogleCalendarToken(userId: string): Promise<string> {
  
  // Creem un client normal per llegir la dada de l'usuari
  const supabase = createClient(); 
  
  const secretKey = process.env.ENCRYPTION_SECRET_KEY;
  if (!secretKey) {
    throw new Error("La clau d'encriptació no està configurada.");
  }

  // 1. Obtenir la credencial ENCRIPTADA de la BD
  const { data: creds, error } = await supabase
    .from("user_credentials")
    .select("refresh_token, access_token, expires_at, provider_user_id, team_id")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .returns<EncryptedCredential[]>()
    .single();

  if (error || !creds) {
    throw new Error("No s'ha trobat la credencial de Google Calendar. Si us plau, torna a connectar.");
  }

  // 2. DESENCRIPTAR els tokens
  const access_token = AES.decrypt(creds.access_token, secretKey).toString(CryptoJS.enc.Utf8);
  const refresh_token = creds.refresh_token 
    ? AES.decrypt(creds.refresh_token, secretKey).toString(CryptoJS.enc.Utf8) 
    : null;
  
  if (!refresh_token) {
    throw new Error("No s'ha trobat un refresh token vàlid (necessari per a l'accés offline).");
  }

  const expires_at = creds.expires_at;
  const expiresAtDate = new Date(expires_at);

  // 3. Comprovar si el token ha caducat (amb un marge de 5 minuts)
  if (expiresAtDate > new Date(Date.now() + 5 * 60 * 1000)) {
    console.log("Token de Google Calendar vàlid. Reutilitzant.");
    return access_token; // El token encara és bo
  }

  // 4. El token ha caducat. L'hem de refrescar.
  console.log("Token de Google Calendar caducat. Refrescant...");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Error en refrescar el token de Google:", errorBody);
    throw new Error("No s'ha pogut refrescar el token de Google. Si us plau, torna a connectar.");
  }

  const newTokens: GoogleRefreshResponse = await response.json();
  const new_expires_at = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // 5. Guardar els nous tokens (encriptats) a la BD
  const new_encrypted_access_token = AES.encrypt(newTokens.access_token, secretKey).toString();
  
  // Fem servir 'createAdminClient' per escriure a la BD des del servidor
  const supabaseAdmin = createAdminClient();
  const { error: updateError } = await supabaseAdmin.from("user_credentials").upsert({
      user_id: userId,
      provider: "google_calendar",
      access_token: new_encrypted_access_token, // El nou token encriptat
      refresh_token: creds.refresh_token, // El refresh token encriptat original (no canvia)
      expires_at: new_expires_at,
      team_id: creds.team_id, // Mantenim el team_id que ja teníem
      provider_user_id: creds.provider_user_id, // Mantenim l'email
  }, { onConflict: 'user_id, provider' });


  if (updateError) {
    // No llencem un error fatal, però ho registrem
    console.error(`Error en guardar el token refrescat: ${updateError.message}`);
  }

  // 6. Retornar el nou access token (desencriptat)
  return newTokens.access_token;
}