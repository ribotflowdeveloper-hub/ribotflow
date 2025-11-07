// supabase/functions/send-email/index.ts (FITXER CORREGIT I COMPLET)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.1.0/mod.ts";
import { decrypt } from "../_shared/crypto.ts";

// --- Helpers de Codificació ---
function encodeSubject(subject: string) {
  const encoded = encodeBase64(new TextEncoder().encode(subject));
  return `=?UTF-8?B?${encoded}?=`;
}
function encodeEmailForGmail(message: string) {
  return encodeBase64(new TextEncoder().encode(message))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
async function getGoogleAccessToken(refreshToken: string) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
      body: JSON.stringify({
        raw: rawEmail,
      }),
    },
  );

  if (!gmailRes.ok) {
    const errorData = await gmailRes.json();
    throw new Error(
      `Error de l'API de Gmail: ${errorData.error?.message || "Error desconegut"}`,
    );
  }
}

/**
 * MICROSOFT: Obté un nou Access Token
 */
async function getMicrosoftAccessToken(refreshToken: string) {
  const tenant = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID") ?? "",
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET") ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/.default",
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
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
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
      `Error de l'API de MS Graph: ${errorData.error?.message || "Error desconegut"}`,
    );
  }
}

/**
 * SMTP: Envia el correu via SMTP
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
  const client = new SMTPClient({
    connection: {
      hostname: config.host,
      port: config.port,
      tls: config.secure,
      auth: {
        username: config.auth.user,
        password: password,
      },
    },
  });

  await client.send({
    from: from,
    to: to,
    subject: subject,
    // content: htmlBody, // ❌ ELIMINAT: Aquesta era la causa del problema
    html: htmlBody, // ✅ CORRECTE: Només enviem la part HTML
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      throw new Error("Alguna variable d'entorn de Supabase no està definida.");
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
    );
    const userAuthClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") ?? "",
          },
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

    // 5. Obtenir el compte d'enviament des de 'user_credentials'
    const { data: account, error: accountError } = await supabaseAdmin
      .from("user_credentials")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider_user_id", user.email)
      .in("provider", ["google_gmail", "microsoft_graph", "custom_email"])
      .maybeSingle();

    if (accountError) {
      throw new Error(`Error buscant credencials: ${accountError.message}`);
    }
    if (!account) {
      throw new Error(
        `[ERROR SEND-EMAIL] No s'ha trobat cap credencial a 'user_credentials' per enviar correus des de ${user.email}.`,
      );
    }

    // 6. Lògica d'enviament per proveïdor
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
      case "microsoft_graph": {
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
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? error.message ?? String(error)
        : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});