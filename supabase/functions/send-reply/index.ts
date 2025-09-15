import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

// Capçaleres CORS per permetre crides des del navegador.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Aquesta Edge Function s'encarrega d'enviar una resposta a un correu electrònic
 * a través de l'API de Gmail, utilitzant les credencials OAuth de l'usuari.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    // Extraiem les dades del correu a enviar des del cos de la petició.
    const { to, subject, body, inReplyTo, references } = await req.json();
    
    // Creem un client de Supabase autenticat com l'usuari que fa la petició.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verifiquem la identitat de l'usuari.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    // --- Procés d'Obtenció de l'Access Token de Google ---
    // 1. Obtenim el 'refresh_token' de l'usuari, que tenim desat de forma segura a la nostra BD.
    const { data: creds } = await supabase.from('user_credentials').select('refresh_token').eq('user_id', user.id).single();
    if (!creds?.refresh_token) throw new Error("No s'han trobat credencials de Google.");

    // 2. Utilitzem el 'refresh_token' per demanar a Google un nou 'access_token' de curta durada.
    // Aquest 'access_token' és el que ens autoritza a fer l'acció en nom de l'usuari.
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: JSON.stringify({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
            refresh_token: creds.refresh_token,
            grant_type: 'refresh_token'
        })
    });
    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    if (!accessToken) throw new Error("No s'ha pogut obtenir l'access token.");

    // --- Construcció i Enviament del Correu ---
    // 3. L'API de Gmail requereix que el correu estigui en format RFC 2822.
    // Construïm la cadena de text amb totes les capçaleres necessàries.
    // 'In-Reply-To' i 'References' són crucials per a que Gmail agrupi la resposta en la conversa correcta.
    const emailBody = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${inReplyTo}`,
      `References: ${references}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].join('\n');

    // 4. Codifiquem el cos del correu en format Base64URL, que és el que l'API espera.
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailBody))).replace(/\+/g, '-').replace(/\//g, '_');

    // 5. Enviem la petició a l'API de Gmail per enviar el correu.
    await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`, // Utilitzem l'access token que acabem d'obtenir.
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64EncodedEmail })
    });

    // Retornem una resposta d'èxit al client.
    return new Response(JSON.stringify({ message: "Resposta enviada correctament." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    // Gestió d'errors.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});