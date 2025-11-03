import { getMailProvider } from "./factory.ts";
import { supabaseAdmin } from "./supabase.ts";
import { getLastSyncDate, saveEmailsAsTickets } from "./db.ts";
import { filterBlacklistedEmails } from "./blacklist.ts";
import { decrypt } from "./crypto.ts"; // <-- 1. Importem la funció de desxifratge

// Funció auxiliar per obtenir les credencials correctes (OAuth o IMAP)
async function getCredentialsForProvider(provider: string, userId: string) {
  
  // 2. Obtenim el secret de l'entorn
  const encryptionSecret = Deno.env.get("ENCRYPTION_SECRET");
  if (!encryptionSecret) {
    // Aquest és un error fatal. Si no hi ha clau, no podem continuar.
    throw new Error("La variable d'entorn ENCRYPTION_SECRET no està configurada al worker.");
  }

  if (provider === "google_gmail" || provider === "microsoft") {
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

    // 3. DESXIFRATGE del Refresh Token
    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = decrypt(data.refresh_token, encryptionSecret);
    } catch (err) {
      // Si falla el desxifratge, no podem continuar per aquest usuari
      const errorMessage = (err instanceof Error) ? err.message : String(err);
      throw new Error(`Error en desxifrar el refresh_token: ${errorMessage}`);
    }

    const mailProvider = getMailProvider(provider);
    if (!mailProvider.refreshAccessToken) {
      throw new Error(
        `El proveïdor ${provider} no té el mètode refreshAccessToken.`,
      );
    }

    // 4. Passem el token DESXIFRAT al proveïdor
    return await mailProvider.refreshAccessToken(decryptedRefreshToken);

  } else if (provider === "custom_email") {
    console.log(`[WORKER-IMAP] Entrant al bloc de 'custom_email'.`);
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

    // 5. DESXIFRATGE de la contrasenya IMAP
    let decryptedPassword: string;
    try {
      decryptedPassword = decrypt(data.encrypted_password, encryptionSecret);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : String(err);
      throw new Error(`Error en desxifrar la contrasenya IMAP: ${errorMessage}`);
    }

    // 6. Retornem la contrasenya DESXIFRADA
    // IMPORTANT: El teu 'CustomMailProvider' (que no has inclòs) ha d'estar
    // preparat per rebre 'decryptedPassword' en lloc de 'encryptedPassword'.
    return {
      config: data.config,
      decryptedPassword: decryptedPassword, 
    };
  }

  throw new Error(
    `La lògica per al proveïdor ${provider} no està implementada.`,
  );
}

// Handler principal
export async function handleSyncRequest(req: Request): Promise<Response> {
  const body = await req.json();
  const { userId, provider } = body;

  if (!userId || !provider) {
    throw new Error("Falten paràmetres 'userId' o 'provider'.");
  }
  
  // ✅ CORRECCIÓ: Afegim un filtre per ignorar proveïdors no relacionats amb el correu.
  // Això soluciona l'error 'Proveïdor desconegut: google_calendar'.
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

  // 1. Obtenir credencials (pot ser un access_token o la config IMAP)
  let credentialsForProvider;
  try {
    credentialsForProvider = await getCredentialsForProvider(provider, userId);
  } catch (err) {
    // Si no hi ha credencials, no és un error 500, és un final esperat.
    const message = (err instanceof Error) ? err.message : String(err);
    console.warn(`[Worker] Avortant sync: ${message}`);
    // NOTA: Google podria haver revocat el token (invalid_grant). Si passa 
    // sovint, hauríem de marcar aquesta credencial com a 'invàlida' a la BBDD
    // i notificar l'usuari perquè torni a connectar.
    return new Response(JSON.stringify({ message }), { status: 200 });
  }

  // 2. Obtenir data de l'últim correu sincronitzat
  const lastSyncDate = await getLastSyncDate(userId, provider);

  // 3. Obtenir missatges nous del proveïdor
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

  // 4. Filtrar per blacklist
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

  // 5. Guardar a la base de dades
  await saveEmailsAsTickets(validEmails, userId, provider);

  return new Response(
    JSON.stringify({ message: "Sincronització completada." }),
    { status: 200 },
  );
}