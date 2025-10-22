// supabase/functions/sync-worker/_lib/handler.ts
import { getMailProvider } from './factory.ts';
import { supabaseAdmin } from './supabase.ts';
import { getLastSyncDate, saveEmailsAsTickets } from './db.ts';
import { filterBlacklistedEmails } from './blacklist.ts';

// Funció auxiliar per obtenir les credencials correctes (OAuth o IMAP)
async function getCredentialsForProvider(provider: string, userId: string) {
  if (provider === 'google' || provider === 'microsoft') {
    const { data, error } = await supabaseAdmin
      .from("user_credentials")
      .select("refresh_token")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();
      
    if (error) throw error;
    if (!data?.refresh_token) throw new Error(`No s'han trobat credencials OAuth per a ${userId}.`);
    
    const mailProvider = getMailProvider(provider);
    if (!mailProvider.refreshAccessToken) {
      throw new Error(`El proveïdor ${provider} no té el mètode refreshAccessToken.`);
    }
    
    // Retorna el access_token refrescat
    return await mailProvider.refreshAccessToken(data.refresh_token);
  
  } else if (provider === 'custom_email') {
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
    
    // Retorna l'objecte de configuració i la contrasenya encriptada
    return {
      config: data.config,
      encryptedPassword: data.encrypted_password
    };
  }
  
  throw new Error(`La lògica per al proveïdor ${provider} no està implementada.`);
}

// Handler principal
export async function handleSyncRequest(req: Request): Promise<Response> {
  const body = await req.json();
  const { userId, provider } = body;
  
  if (!userId || !provider) {
    throw new Error("Falten paràmetres 'userId' o 'provider'.");
  }
  console.log(`[WORKER] Iniciant sincronització per a: ${userId}, proveïdor: ${provider}`);
  
  const mailProvider = getMailProvider(provider);
  
  // 1. Obtenir credencials (pot ser un access_token o la config IMAP)
  let credentialsForProvider;
  try {
    credentialsForProvider = await getCredentialsForProvider(provider, userId);
  } catch (err) {
    // Si no hi ha credencials, no és un error 500, és un final esperat.
    const message = (err instanceof Error) ? err.message : String(err);
    console.warn(`[Worker] Avortant sync: ${message}`);
    return new Response(JSON.stringify({ message }), { status: 200 });
  }

  // 2. Obtenir data de l'últim correu sincronitzat
  const lastSyncDate = await getLastSyncDate(userId, provider);

  // 3. Obtenir missatges nous del proveïdor
  const newEmails = await mailProvider.getNewMessages(credentialsForProvider, lastSyncDate);

  if (newEmails.length === 0) {
    console.log(`[SYNC ${provider.toUpperCase()}] No hi ha missatges nous.`);
    return new Response(JSON.stringify({ message: "Sincronització completada, sense missatges nous." }), { status: 200 });
  }
  
  console.log(`[WORKER-FINAL] A punt d'inserir ${newEmails.length} nous tiquets per a ${provider}.`);

  // 4. Filtrar per blacklist
  const validEmails = await filterBlacklistedEmails(newEmails, userId);

  if (validEmails.length === 0) {
    console.log(`[Worker] Tots els ${newEmails.length} missatges nous estaven a la llista negra.`);
    return new Response(JSON.stringify({ message: "Sincronització completada, tots els missatges han estat filtrats." }), { status: 200 });
  }

  // 5. Guardar a la base de dades
  await saveEmailsAsTickets(validEmails, userId, provider);

  return new Response(JSON.stringify({ message: "Sincronització completada." }), { status: 200 });
}