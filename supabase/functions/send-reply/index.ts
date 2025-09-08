// supabase/functions/send-reply/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    const { to, subject, body, inReplyTo, references } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    // Obtenir el refresh_token de l'usuari
    const { data: creds } = await supabase.from('user_credentials').select('refresh_token').eq('user_id', user.id).single();
    if (!creds?.refresh_token) throw new Error("No s'han trobat credencials de Google.");

    // Obtenir un nou access_token
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

    // Construir l'email en format RFC 2822 (Base64URL)
    const emailBody = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${inReplyTo}`,
      `References: ${references}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].join('\n');

    const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailBody))).replace(/\+/g, '-').replace(/\//g, '_');

    // Enviar l'email a través de l'API de Gmail
    await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64EncodedEmail })
    });

    return new Response(JSON.stringify({ message: "Resposta enviada correctament." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});