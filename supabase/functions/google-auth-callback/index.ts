import { serve } from 'https-deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

/**
 * Aquesta Edge Function gestiona la resposta de Google després que un usuari
 * autoritzi la nostra aplicació a accedir a les seves dades (flux OAuth 2.0).
 * La seva funció és intercanviar un codi d'autorització per un 'refresh token'
 * i desar aquest token de forma segura a la nostra base de dades.
 */
serve(async (req) => {
  // Creem un client de Supabase ADMINISTRATIU per poder escriure a la taula de credencials.
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  try {
    // Google redirigeix l'usuari a aquesta funció amb paràmetres a la URL.
    const url = new URL(req.url);
    const code = url.searchParams.get('code'); // Codi d'autorització d'un sol ús.
    const userId = url.searchParams.get('state'); // Vam passar l'ID de l'usuari en el paràmetre 'state' per saber a qui pertany la credencial.

    if (!code || !userId) throw new Error('Falta el codi o l\'ID d\'usuari');

    // Fem una petició als servidors de Google per intercanviar el 'code' per tokens d'accés.
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
        // La 'redirect_uri' ha de coincidir exactament amb la configurada a la consola de Google Cloud.
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-auth-callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokens = await response.json();
    // El 'refresh_token' és la clau més important. Ens permetrà obtenir nous 'access_tokens'
    // en el futur sense que l'usuari hagi de tornar a donar permisos. Només es rep la primera vegada.
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) throw new Error('No s\'ha rebut el refresh token de Google.');

    // Desem el 'refresh_token' a la nostra taula 'user_credentials', associat a l'usuari.
    // 'upsert' actualitzarà el token si ja n'existia un per a aquest usuari i proveïdor ('onConflict').
    const { error } = await supabaseAdmin
      .from('user_credentials')
      .upsert({ 
        user_id: userId, 
        provider: 'google',
        refresh_token: refreshToken
      }, { onConflict: 'user_id, provider' });
    
    if (error) throw error;
    
    // Finalment, redirigim l'usuari de nou a la pàgina de configuració de la nostra aplicació,
    // indicant que la connexió ha estat un èxit.
    const appUrl = Deno.env.get('VITE_APP_URL') || 'http://localhost:5173';
    return Response.redirect(`${appUrl}/settings/integrations?status=success`);

  } catch (error) {
    console.error(error);
    // Si alguna cosa falla, redirigim a la mateixa pàgina però amb un estat d'error.
    const appUrl = Deno.env.get('VITE_APP_URL') || 'http://localhost:5173';
    return Response.redirect(`${appUrl}/settings/integrations?status=error`);
  }
});