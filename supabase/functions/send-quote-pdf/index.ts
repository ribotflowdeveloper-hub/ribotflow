// supabase/functions/send-quote-pdf/index.ts (REFACTORITZAT)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { fetchData } from "./_lib/dataFetcher.ts";
import { downloadAndEncodePdf } from "./_lib/storageHandler.ts";
import { getGoogleAuthData } from "./_lib/googleAuth.ts";
import { buildMimeMessage, encodeEmailForGmail } from "./_lib/emailBuilder.ts";
import { updateDatabaseStatus } from "./_lib/supabaseUpdater.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Creem client admin (només un cop)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log("Processing request...");
    // 1. Obtenir quoteId de la petició
    const { quoteId } = await req.json();
    if (!quoteId || typeof quoteId !== 'number') {
      throw new Error("Falta el 'quoteId' numèric al cos de la petició.");
    }
    console.log("Parsed quoteId:", quoteId);

    // 2. Obtenir dades de Supabase
    const { quote, contact, companyName } = await fetchData(supabaseAdmin, quoteId);

    // 3. Descarregar i codificar PDF
    const pdfBase64 = await downloadAndEncodePdf(supabaseAdmin, quote);

    // 4. Obtenir autenticació de Google (User i Access Token)
    const authHeader = req.headers.get('Authorization');
    const { user, accessToken } = await getGoogleAuthData(supabaseAdmin, authHeader);

    // 5. Construir l'enllaç del portal
    const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:3000'; // Recorda configurar APP_BASE_URL
    const clientPortalUrl = `${baseUrl}/quote/${quote.secure_id}`;

    // 6. Construir el missatge MIME
    const emailMessage = buildMimeMessage(contact, quote, companyName, clientPortalUrl, user.email!, pdfBase64);

    // 7. Enviar l'email via Gmail API
    let gmailResponseText = "Gmail response not read yet";
    let gmailResponseStatus = 0;
    try {
      console.log("Sending email via Gmail API...");
      const gmailRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodeEmailForGmail(emailMessage) })
      });
      gmailResponseStatus = gmailRes.status;
      gmailResponseText = await gmailRes.text(); // Llegim sempre
      console.log("Gmail API Response Status:", gmailResponseStatus);
      console.log("Gmail API Response Body:", gmailResponseText);

      if (!gmailRes.ok) {
        throw new Error(`Gmail API request failed with status ${gmailResponseStatus}`);
      }
      console.log("Email sent successfully via Gmail API.");
    } catch (gmailErr) {
       console.error("Error during Gmail API request:", gmailErr);
       const errorMessage = typeof gmailErr === 'object' && gmailErr !== null && 'message' in gmailErr
         ? (gmailErr as { message: string }).message
         : String(gmailErr);
       throw new Error(`Failed to send email via Gmail: ${errorMessage}. Raw response (${gmailResponseStatus}): ${gmailResponseText}`);
    }

    // 8. Actualitzar estats a Supabase (sense interrompre si falla)
    await updateDatabaseStatus(supabaseAdmin, quote);

    // 9. Retornar èxit
    console.log("Function executed successfully.");
    return new Response(JSON.stringify({ success: true, message: "Pressupost enviat correctament." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    // Captura tots els errors
    console.error("[FINAL ERROR in send-quote-pdf]", error);
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error
      ? (error as { message: string }).message
      : String(error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});