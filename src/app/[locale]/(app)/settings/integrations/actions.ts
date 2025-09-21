/**
 * @file actions.ts (Integrations)
 * @summary Versió final i definitiva per a la gestió d'integracions.
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';

// --- ACCIONS DE CONNEXIÓ (FLUX D'AUTORITZACIÓ DIRECTE) ---

export async function connectGoogleAction() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const state = uuidv4();
  (await cookieStore).set('oauth_state', state, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/google`;
  const googleParams = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${googleParams.toString()}`;
  redirect(authUrl);
}

export async function connectMicrosoftAction() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const state = uuidv4();
  (await cookieStore).set('oauth_state', state, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/microsoft`;
  const microsoftParams = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid email offline_access User.Read Mail.Read Mail.Send',
    state: state,
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${microsoftParams.toString()}`;
  redirect(authUrl);
}

// Acció per iniciar OAuth amb LinkedIn
export async function connectLinkedInAction() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const state = uuidv4();
  (await cookieStore).set('oauth_state', state, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/linkedin`;
  const linkedinParams = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: redirectUri,
    state: state,
    scope: 'openid profile email w_member_social',
    prompt: 'consent', // ajuda a forçar el consentiment de nou si escau
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${linkedinParams.toString()}`;
  redirect(authUrl);
}
// ✅ CORRECCIÓ: La funció de Facebook ara segueix el mateix patró que les altres.
export async function connectFacebookAction() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const state = uuidv4();
  (await cookieStore).set('oauth_state', state, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/facebook`;
  
  // ✅ CORRECCIÓ DEFINITIVA: Demanem tots els permisos necessaris des del principi.
  const scopes = [
    'pages_show_list',
    'pages_manage_posts',
    'business_management', // Aquest és el permís clau que ens faltava
    'instagram_basic',
    'instagram_content_publish'
  ].join(',');

  const facebookParams = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    state: state,
  });

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${facebookParams.toString()}`;
  redirect(authUrl);
}
// --- FUNCIONS DE DESCONNEXIÓ ---

async function handleDisconnect(provider: 'google' | 'azure' | 'linkedin_oidc' | 'facebook') {
  const cookieStore = cookies();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuari no trobat." };

  try {
    const providerName = provider.replace('_oidc', '');
    // Assegura't que tens una Edge Function anomenada 'facebook-revoke-token'
    await supabase.functions.invoke(`${providerName}-revoke-token`);
    await supabase.from('user_credentials').delete().match({ user_id: user.id, provider: provider });

    revalidatePath('/settings/integrations');
    return { success: true, message: `Integració amb ${provider} desconnectada correctament.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconegut";
    console.error(`--- ERROR DURANT LA DESCONNEXIÓ DE ${provider.toUpperCase()} ---`, errorMessage);
    return { success: false, message: `No s'ha pogut desconnectar la integració de ${provider}.` };
  }
}

export async function disconnectGoogleAction() {
  return await handleDisconnect('google');
}

export async function disconnectMicrosoftAction() {
  return await handleDisconnect('azure');
}

export async function disconnectLinkedInAction() {
  return await handleDisconnect('linkedin_oidc');
}

// ✅ NOU: Funció de desconnexió per a Facebook
export async function disconnectFacebookAction() {
  return await handleDisconnect('facebook');
}
