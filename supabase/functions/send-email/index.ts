// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
// ✅ 1. CORRECCIÓ D'IMPORT: SmtpClient -> SMTPClient
import { SMTPClient } from "https://deno.land/x/denomailer@1.1.0/mod.ts";
import { decrypt } from "../_shared/crypto.ts"; // Assegurem que la ruta al teu 'crypto.ts' és correcta

// --- Helpers de Codificació (Els teus estaven perfectes) ---
function encodeSubject(subject: string): string {
  const encoded = encodeBase64(new TextEncoder().encode(subject));
  return `=?UTF-8?B?${encoded}?=`;
}

function encodeEmailForGmail(message: string): string {
  return encodeBase64(new TextEncoder().encode(message)).replace(/\+/g, "-")
    .replace(/\//g, "_").replace(/=+$/, "");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Helpers d'Enviament per Proveïdor ---

/**
 * GOOGLE: Obté un nou Access Token
 */
async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await tokenResponse.json();
  if (!tokens.access_token) {
    throw new Error("No s'ha pogut obtenir l'access token de Google.");
  }
  return tokens.access_token;
}

/**
 * GOOGLE: Envia el correu via API de Gmail
 */
async function sendGoogleMail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
) {
  const emailMessage = [
    `Content-Type: text/html; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodeSubject(subject)}`,
    ``,
    htmlBody,
  ].join("\n");

  const rawEmail = encodeEmailForGmail(emailMessage);

  const gmailRes = await fetch(
    "https://www.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEmail }),
    },
  );

  if (!gmailRes.ok) {
    const errorData = await gmailRes.json();
    throw new Error(
      `Error de l'API de Gmail: ${
        errorData.error?.message || "Error desconegut"
      }`,
    );
  }
}

/**
 * MICROSOFT: Obté un nou Access Token
 */
async function getMicrosoftAccessToken(refreshToken: string): Promise<string> {
  const tenant = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/.default", // Requerit per a refresh tokens de MS
      }),
    },
  );
  const tokens = await tokenResponse.json();
  if (!tokens.access_token) {
    throw new Error("No s'ha pogut obtenir l'access token de Microsoft.");
  }
  return tokens.access_token;
}

/**
 * MICROSOFT: Envia el correu via API de MS Graph
 */
async function sendMicrosoftMail(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
) {
  const emailPayload = {
    message: {
      subject: subject,
      body: {
        contentType: "HTML",
        content: htmlBody,
      },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: "true",
  };

  const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!graphRes.ok) {
    const errorData = await graphRes.json();
    throw new Error(
      `Error de l'API de MS Graph: ${
        errorData.error?.message || "Error desconegut"
      }`,
    );
  }
}

/**
 * SMTP Genèric: Envia el correu
 * ✅ 2. CORRECCIÓ: Adaptat a l'API de denomailer v1.1.0 i al teu 'config.smtp'
 */
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
  };
}

async function sendSmtpMail(
  config: SmtpConfig,
  password: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
) {
  // La configuració es passa al constructor
  const client = new SMTPClient({
    connection: {
      hostname: config.host,
      port: config.port,
      tls: config.secure, // El teu 'secure: true' es mapeja a 'tls: true'
      auth: {
        username: config.auth.user, // Canviat 'user' a 'username' segons l'API de denomailer
        password: password,
      },
    },
  });

  // El mètode 'send' gestiona la connexió i desconnexió
  await client.send({
    from: from,
    to: to,
    subject: subject,
    content: htmlBody, // Contingut de text pla (fallback)
    html: htmlBody, // Contingut HTML
  });
}

// --- Servidor Principal de l'Edge Function ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Obtenir dades de la petició
    const { contactId, subject, htmlBody } = await req.json();
    if (!contactId || !subject || !htmlBody) {
      throw new Error(
        "Falten paràmetres: 'contactId', 'subject', o 'htmlBody'.",
      );
    }

    // 2. Obtenir clients de Supabase i usuari
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userAuthClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );
    const { data: { user } } = await userAuthClient.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat.");

    // 3. Obtenir la clau de desxifratge
    const encryptionSecret = Deno.env.get("ENCRYPTION_SECRET");
    if (!encryptionSecret) {
      throw new Error(
        "ENCRYPTION_SECRET no està configurat a l'Edge Function.",
      );
    }

    // 4. Obtenir dades del contacte (Destinatari)
    const { data: contact, error: contactError } = await supabaseAdmin
      .from("contacts")
      .select("email, nom")
      .eq("id", contactId)
      .single();
    if (contactError || !contact) {
      throw new Error(`No s'ha trobat el contacte amb ID ${contactId}.`);
    }

    // 5. ✅ REFACTOR: Obtenir el compte d'enviament des de 'user_credentials'
    const { data: account, error: accountError } = await supabaseAdmin
      .from("user_credentials")
      .select("*") // Agafem tot: provider, refresh_token, config, encrypted_password, provider_user_id
      .eq("user_id", user.id)
      .eq("provider_user_id", user.email!) // El remitent és l'email de l'usuari autenticat
      // Filtrem només per proveïdors que poden enviar correu
      // (He afegit 'microsoft_graph' com a suposició, canvia-ho si el teu es diu diferent)
      .in("provider", ["google_gmail", "microsoft_graph", "custom_email"])
      .maybeSingle();

    if (accountError) {
      throw new Error(`Error buscant credencials: ${accountError.message}`);
    }
    if (!account) {
      // Aquest és l'error que et sortia abans, ara amb el nom de la taula correcte
      throw new Error(
        `[ERROR SEND-EMAIL] No s'ha trobat cap credencial a 'user_credentials' per enviar correus des de ${user.email}.`,
      );
    }

    // 6. ✅ REFACTOR: Lògica d'enviament per proveïdor (ara utilitza 'user_credentials')
    // El 'provider_user_id' (p.ex., info@digitaistudios.com) és el nostre 'fromEmail'
    const fromEmail = account.provider_user_id;

    switch (account.provider) {
      case "google_gmail": {
        if (!account.refresh_token) {
          throw new Error(
            "Compte de Google ('google_gmail') sense 'refresh_token' encriptat.",
          );
        }
        const refreshToken = await decrypt(
          account.refresh_token,
          encryptionSecret,
        );
        const accessToken = await getGoogleAccessToken(refreshToken);
        await sendGoogleMail(
          accessToken,
          fromEmail,
          contact.email,
          subject,
          htmlBody,
        );
        break;
      }

      case "microsoft_graph": { // Canvia "microsoft_graph" si el teu provider es diu diferent
        if (!account.refresh_token) {
          throw new Error(
            "Compte de Microsoft sense 'refresh_token' encriptat.",
          );
        }
        const refreshToken = await decrypt(
          account.refresh_token,
          encryptionSecret,
        );
        const accessToken = await getMicrosoftAccessToken(refreshToken);
        await sendMicrosoftMail(accessToken, contact.email, subject, htmlBody);
        break;
      }

      case "custom_email": {
        if (!account.config?.smtp || !account.encrypted_password) {
          throw new Error(
            "Compte SMTP ('custom_email') no té 'config.smtp' o 'encrypted_password'.",
          );
        }
        const password = await decrypt(
          account.encrypted_password,
          encryptionSecret,
        );
        // Passem l'objecte config.smtp sencer
        await sendSmtpMail(
          account.config.smtp,
          password,
          fromEmail,
          contact.email,
          subject,
          htmlBody,
        );
        break;
      }

      default:
        throw new Error(
          `El proveïdor '${account.provider}' no és compatible per a l'enviament de correus.`,
        );
    }

    // 7. Retornar èxit
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ERROR SEND-EMAIL]", error);
    const errorMessage = typeof error === "object" && error !== null && "message" in error
      ? (error as { message?: string }).message ?? String(error)
      : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
