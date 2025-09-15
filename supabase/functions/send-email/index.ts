/**
 * @file index.ts (send-email)
 * @summary Aquesta és una Supabase Edge Function que actua com un backend segur per enviar
 * correus electrònics a través de l'API de Gmail, utilitzant les credencials de l'usuari.
 * Aquest enfocament és segur perquè les claus secretes i els refresh tokens mai s'exposen al client.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// --- Funcions d'Ajuda per a la Codificació ---

/**
 * @summary Codifica l'assumpte del correu a Base64 seguint el format RFC 2047 per a caràcters especials (accents, etc.).
 */
function encodeSubject(subject: string): string {
  const encoded = encodeBase64(new TextEncoder().encode(subject));
  return `=?UTF-8?B?${encoded}?=`;
}

/**
 * @summary Codifica el cos del correu a Base64 URL-safe, que és el format que requereix l'API de Gmail.
 */
function encodeEmailForGmail(message: string): string {
  return encodeBase64(new TextEncoder().encode(message))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { contactId, subject, htmlBody } = await req.json();
    if (!contactId || !subject || !htmlBody) {
      throw new Error("Falten paràmetres: 'contactId', 'subject', o 'htmlBody'.");
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // PAS 1: Obtenir l'email del contacte destinatari.
    const { data: contact, error: contactError } = await supabaseAdmin.from('contacts').select('email, nom').eq('id', contactId).single();
    if (contactError || !contact) { throw new Error(`No s'ha trobat el contacte amb ID ${contactId}.`); }

    // PAS 2: Autenticar l'usuari que envia el correu i obtenir les seves credencials de Google.
    const userAuthClient = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      // Passem la capçalera 'Authorization' del client a aquest nou client de Supabase.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userAuthClient.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat.");

    const { data: creds } = await supabaseAdmin.from('user_credentials').select('refresh_token').eq('user_id', user.id).eq('provider', 'google').single();
    if (!creds?.refresh_token) throw new Error("No s'han trobat les credencials de Google per a aquest usuari.");

    // PAS 3: Utilitzar el 'refresh_token' per obtenir un nou 'access_token' de Google.
    // L''access_token' és de curta durada i és el que ens autoritza a fer la petició a l'API de Gmail.
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token',
      })
    });
    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    if (!accessToken) throw new Error("No s'ha pogut obtenir l'access token de Google.");

    // PAS 4: Construir el missatge del correu en format MIME i codificar-lo.
    const emailMessage = [
      `Content-Type: text/html; charset="UTF-8"`,
      `MIME-Version: 1.0`,
      `To: ${contact.email}`,
      `From: ${user.email}`,
      `Subject: ${encodeSubject(subject)}`,
      ``,
      htmlBody
    ].join('\n');

    const rawEmail = encodeEmailForGmail(emailMessage);

    // PAS 5: Enviar el correu a través de l'API de Gmail.
    const gmailRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: rawEmail })
    });

    if (!gmailRes.ok) {
      const errorData = await gmailRes.json();
      throw new Error(`Error de l'API de Gmail: ${errorData.error?.message || 'Error desconegut'}`);
    }

    // PAS 6: Retornar èxit.
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("[ERROR SEND-EMAIL]", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
