import { getMailProvider } from "./factory.ts";
import { supabaseAdmin } from "./supabase.ts";
import { getLastSyncDate, saveEmailsAsTickets } from "./db.ts";
import { filterBlacklistedEmails } from "./blacklist.ts";
import { decrypt } from "./crypto.ts";

async function getCredentialsForProvider(provider: string, userId: string) {
  
  const encryptionSecret = Deno.env.get("ENCRYPTION_SECRET_KEY");
  if (!encryptionSecret) {
    throw new Error("La variable d'entorn ENCRYPTION_SECRET_KEY no està configurada al worker.");
  }
  console.log(`[ENCRYPTION_SECRET_KEY] ${encryptionSecret}`);
  if (provider === "google_gmail" || provider === "microsoft") {
    // --- LÒGICA PER A GOOGLE / MICROSOFT (OAuth) ---
    // Aquesta part SÍ desxifra.
    const { data, error } = await supabaseAdmin
      .from("user_credentials")
      .select("refresh_token")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    if (error) throw error;
    if (!data?.refresh_token) {
      throw new Error(`No s'han trobat credencials OAuth per a ${userId}.`);
    }

    // Desxifrem el Refresh Token amb la clau correcta
    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = await decrypt(data.refresh_token, encryptionSecret);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : String(err);
      throw new Error(`Error en desxifrar el refresh_token: ${errorMessage}`);
    }

    const mailProvider = getMailProvider(provider);
    if (!mailProvider.refreshAccessToken) {
      throw new Error(
        `El proveïdor ${provider} no té el mètode refreshAccessToken.`,
      );
    }
    
    // Passem el token DESXIFRAT
    return await mailProvider.refreshAccessToken(decryptedRefreshToken);

  } else if (provider === "custom_email") {
    // --- LÒGICA PER A CUSTOM EMAIL (IMAP) ---
    // ✅ CORRECCIÓ: Aquesta part JA NO desxifra res.
    // Simplement agafa les dades encriptades i les passa al CustomMailProvider.
    console.log(`[WORKER-IMAP] Obtenint credencials encriptades per a ${userId}.`);
    const { data, error } = await supabaseAdmin
      .from("user_credentials")
      .select("config, encrypted_password")
      .eq("user_id", userId)
      .eq("provider", "custom_email")
      .maybeSingle();

    if (error) throw error;
    if (!data?.config || !data.encrypted_password) {
      throw new Error(`No s'han trobat credencials IMAP per a ${userId}.`);
    }

    // ✅ CORRECCIÓ: Retornem la 'encrypted_password' directament.
    // Això arreglarà l'error "Falten credencials"
    return {
      config: data.config,
      encryptedPassword: data.encrypted_password, 
    };
  }

  throw new Error(
    `La lògica per al proveïdor ${provider} no està implementada.`,
  );
}

// Handler principal (Sense canvis, es queda com el tenies)
export async function handleSyncRequest(req: Request): Promise<Response> {
  const body = await req.json();
  const { userId, provider } = body;

  if (!userId || !provider) {
    throw new Error("Falten paràmetres 'userId' o 'provider'.");
  }
  
  const MAIL_PROVIDERS = [
    "google",
    "google_gmail",
    "microsoft",
    "custom_email",
  ];
  if (!MAIL_PROVIDERS.includes(provider)) {
    console.warn(
      `[WORKER] Ignorant sol·licitud per a un proveïdor no-mail: ${provider} (Usuari: ${userId})`,
    );
    return new Response(
      JSON.stringify({
        message: "Proveïdor ignorat (no és un proveïdor de correu).",
      }),
      { status: 200 },
    );
  }

  console.log(
    `[WORKER] Iniciant sincronització per a: ${userId}, proveïdor: ${provider}`,
  );

  const mailProvider = getMailProvider(provider);

  let credentialsForProvider;
  try {
    credentialsForProvider = await getCredentialsForProvider(provider, userId);
  } catch (err) {
    const message = (err instanceof Error) ? err.message : String(err);
    console.warn(`[Worker] Avortant sync: ${message}`);
    return new Response(JSON.stringify({ message }), { status: 200 });
  }

  const lastSyncDate = await getLastSyncDate(userId, provider);

  const newEmails = await mailProvider.getNewMessages(
    credentialsForProvider,
    lastSyncDate,
  );

  if (newEmails.length === 0) {
    console.log(`[SYNC ${provider.toUpperCase()}] No hi ha missatges nous.`);
    return new Response(
      JSON.stringify({
        message: "Sincronització completada, sense missatges nous.",
      }),
      { status: 200 },
    );
  }

  console.log(
    `[WORKER-FINAL] A punt d'inserir ${newEmails.length} nous tiquets per a ${provider}.`,
  );

  const validEmails = await filterBlacklistedEmails(newEmails, userId);

  if (validEmails.length === 0) {
    console.log(
      `[Worker] Tots els ${newEmails.length} missatges nous estaven a la llista negra.`,
    );
    return new Response(
      JSON.stringify({
        message:
          "Sincronització completada, tots els missatges han estat filtrats.",
      }),
      { status: 200 },
    );
  }

  await saveEmailsAsTickets(validEmails, userId, provider);

  return new Response(
    JSON.stringify({ message: "Sincronització completada." }),
    { status: 200 },
  );
}