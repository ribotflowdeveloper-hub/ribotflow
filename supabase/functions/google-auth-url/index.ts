// Aquesta Edge Function s'executa als servidors de Supabase i utilitza Deno.
import { serve } from 'https-deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

// Definim les capçaleres CORS per permetre crides des del navegador.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Aquesta funció és el PUNT D'INICI del flux d'autenticació amb Google (OAuth 2.0).
 * La seva única responsabilitat és construir de forma segura la URL a la qual
 * hem de redirigir l'usuari perquè autoritzi la nostra aplicació.
 */
serve(async (req) => {
  // Gestió de la petició pre-vol (preflight) per a CORS.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Creem un client de Supabase utilitzant el token de l'usuari que fa la petició.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verifiquem que l'usuari estigui autenticat a la nostra aplicació.
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not found');

    // Construïm els paràmetres de la URL d'autorització de Google.
    const params = new URLSearchParams({
      // L'ID de client de la nostra aplicació, obtingut de Google Cloud Console.
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      // La URL a la qual Google redirigirà l'usuari DESPRÉS que accepti o rebutgi els permisos.
      // Apunta a la nostra altra Edge Function: 'google-auth-callback'.
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-auth-callback`,
      // Els 'scopes' defineixen QUINS PERMISOS estem demanant. En aquest cas, llegir i enviar correus.
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
      // Demanem un 'code' (codi d'autorització) com a resposta.
      response_type: 'code',
      // 'access_type: offline' és CRUCIAL. Li diu a Google que volem un 'refresh_token',
      // que ens permetrà accedir a les dades de l'usuari en el futur sense que hagi de tornar a iniciar sessió.
      access_type: 'offline',
      // 'prompt: consent' força que la pantalla de consentiment aparegui sempre,
      // assegurant que rebem el 'refresh_token' fins i tot si l'usuari ja havia donat permisos abans.
      prompt: 'consent',
      // El paràmetre 'state' és una mesura de seguretat i estat. Hi passem l'ID de l'usuari.
      // Google ens el retornarà a la 'redirect_uri', i així sabrem a quin usuari pertany el 'code'.
      state: user.id,
    });

    // Construïm la URL final.
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    // Retornem la URL al client en format JSON. El frontend s'encarregarà de redirigir l'usuari.
    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Gestió d'errors.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});