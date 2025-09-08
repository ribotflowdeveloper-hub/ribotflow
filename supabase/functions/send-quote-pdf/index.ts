import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
// ✅ CORRECCIÓ: Importem directament 'encodeBase64'
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// Helper per codificar correctament els assumptes amb caràcters especials (UTF-8)
function encodeSubject(subject: string): string {
  const encoded = encodeBase64(new TextEncoder().encode(subject));
  return `=?UTF-8?B?${encoded}?=`;
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
    const { quoteId } = await req.json();
    if (!quoteId) {
      throw new Error("Falta el 'quoteId' al cos de la petició.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // PAS 1: Obtenir totes les dades necessàries amb les validacions al principi
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('*, contacts(*), user_id, secure_id, opportunity_id')
      .eq('id', quoteId)
      .single();

    if (quoteError) throw new Error(`Error obtenint el pressupost: ${quoteError.message}`);
    if (!quote) throw new Error(`El pressupost amb ID ${quoteId} no s'ha trobat.`);

    const { contacts: contact, user_id, quote_number } = quote;
    if (!contact) {
      throw new Error(`El pressupost #${quote_number} no té cap contacte assignat.`);
    }
    if (!contact.email) {
      throw new Error(`El contacte '${contact.nom}' no té una adreça d'email definida.`);
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('company_name').eq('id', user_id).single();

    // PAS 2: Obtenir l'enllaç públic del PDF des de Storage
    const filePath = `${user_id}/${quote.id}.pdf`;
    const { data: { publicUrl } } = supabaseAdmin.storage.from('quotes').getPublicUrl(filePath);
    if (!publicUrl) {
      throw new Error("No s'ha pogut obtenir l'enllaç públic del PDF.");
    }

    // PAS 3: Descarregar el PDF i convertir-lo a Base64
    const pdfResponse = await fetch(publicUrl);
    if (!pdfResponse.ok) throw new Error("No s'ha pogut descarregar el PDF des de Storage.");
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = encodeBase64(pdfArrayBuffer);

    // PAS 4: Construir l'enllaç al portal del client
    const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
    const clientPortalUrl = `${baseUrl}/quote/${quote.secure_id}`;

    // PAS 5: Autenticació amb Google
    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();
    if (!user) throw new Error("Usuari no autenticat.");

    const { data: creds } = await supabaseAdmin.from('user_credentials').select('refresh_token').eq('user_id', user.id).single();
    if (!creds?.refresh_token) throw new Error("No s'han trobat les credencials de Google. Si us plau, connecta el teu compte a 'Integracions'.");

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
    if (!tokens.access_token) throw new Error(`No s'ha pogut obtenir l'access token de Google. Potser cal reconnectar el compte.`);
    const accessToken = tokens.access_token;
    
    // PAS 6: Construir el correu
    const subject = `El teu pressupost ${quote_number} de ${profile?.company_name || 'la teva empresa'}`;
    const boundary = `----=_Part_${crypto.randomUUID()}`;

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <p>Hola <strong>${contact.nom}</strong>,</p>
        <p>Gràcies per la teva confiança. Hem adjuntat una còpia en PDF del pressupost <strong>#${quote_number}</strong>.</p>
        <p>Per a la teva comoditat, també pots revisar, acceptar o rebutjar el pressupost de forma digital fent clic al següent botó:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${clientPortalUrl}" style="display: inline-block; background-color: #007bff; color: #fff; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: all 0.3s ease;">
            Revisar i Acceptar Online
          </a>
        </div>
        <div style="text-align: center; margin: 15px 0;">
          <a href="${publicUrl}" style="display: inline-block; background-color: #6c757d; color: #fff; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 500; box-shadow: 0 3px 7px rgba(0,0,0,0.1); transition: all 0.3s ease;">
            Veure Pressupost PDF
          </a>
        </div>
        <p>Estem a la teva disposició per a qualsevol dubte que puguis tenir.</p>
        <p>Salutacions,<br><strong>${profile?.company_name || user.email}</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Aquest missatge és automàtic. Si tens algun problema amb els enllaços, contacta amb nosaltres a <a href="mailto:${user.email}" style="color: #007bff; text-decoration: none;">${user.email}</a>.
        </p>
      </div>
    `;

    const emailMessage = [
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      `MIME-Version: 1.0`,
      `To: ${contact.email}`,
      `From: ${user.email}`,
      `Subject: ${encodeSubject(subject)}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlBody,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${quote_number}.pdf"`,
      ``,
      pdfBase64,
      ``,
      `--${boundary}--`
    ].join('\n');

    // Funció helper per a l'enviament a l'API de Gmail
    function encodeEmailForGmail(msg: string): string {
      return encodeBase64(new TextEncoder().encode(msg))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    // PAS 7: Enviar el correu
    const gmailRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodeEmailForGmail(emailMessage) })
    });

    if (!gmailRes.ok) {
      const errorData = await gmailRes.json();
      throw new Error(`Error de l'API de Gmail: ${errorData.error?.message || 'Error desconegut'}`);
    }

    // PAS 8: Actualitzar l'estat del pressupost
    await supabaseAdmin
      .from('quotes')
      .update({ status: 'Sent', sent_at: new Date().toISOString() })
      .eq('id', quoteId);

    // PAS 9: Actualitzar l'oportunitat associada (si existeix)
    if (quote.opportunity_id) {
       await supabaseAdmin
        .from('opportunities')
        .update({ stage_name: 'Proposta Enviada' })
        .eq('id', quote.opportunity_id);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("[ERROR A send-quote-pdf]", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});