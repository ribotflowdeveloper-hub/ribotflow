// supabase/functions/sync-worker/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- TIPUS I INTERFÍCIES COMUNES ---
// Aquestes interfícies defineixen un "contracte" per a la nostra lògica,
// fent que sigui més fàcil afegir nous proveïdors de correu en el futur.

/**
 * Representa les dades d'un correu en un format estàndard i normalitzat.
 * Independentment de si el correu ve de Google o Microsoft, el transformem
 * a aquesta estructura abans de desar-lo.
 */
interface NormalizedEmail {
  provider_message_id: string;// L'ID únic del missatge al proveïdor (Google, Microsoft).
  subject: string;
  body: string;
  preview: string;
  sent_at: string; // ISO String
  sender_name: string;
  sender_email: string;
  status: 'Obert' | 'Llegit';
  type: 'rebut' | 'enviat';
}

/**
 * Aquesta interfície defineix els mètodes que CADA proveïdor de correu
 * (Google, Microsoft, etc.) ha d'implementar. Garanteix que tots els proveïdors
 * tinguin la mateixa "forma" i siguin intercanviables.
 */
interface MailProvider {
  refreshAccessToken(refreshToken: string): Promise<string>;
  getNewMessages(accessToken: string, lastSyncDate: Date | null): Promise<NormalizedEmail[]>;
}


// --- CONFIGURACIÓ GLOBAL ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Inicialitzem el client de Supabase una sola vegada fora de la funció principal
// per a una millor eficiència si la Edge Function es manté "calenta" (reutilitzada).
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


// --- LÒGICA PER A MICROSOFT (GRAPH API) ---
/**
 * Implementació de la interfície 'MailProvider' per a Microsoft.
 * Conté tota la lògica específica per comunicar-se amb l'API de Microsoft Graph.
 */
class MicrosoftMailProvider implements MailProvider {
  private clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
  private clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
  private tenantId = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
  // Obté un nou 'access token' de curta durada utilitzant el 'refresh token'.

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const res = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/.default',
      }),
    });
    if (!res.ok) {
      throw new Error(`Microsoft token refresh failed: ${await res.text()}`);
    }
    const tokens = await res.json();
    return tokens.access_token;
  }
// Mètode principal per obtenir nous missatges. Crida a la funció auxiliar per a
  // la bústia d'entrada i la de sortida.
  async getNewMessages(accessToken: string, lastSyncDate: Date | null): Promise<NormalizedEmail[]> {
    const inboxMessages = await this.fetchMessagesFromFolder(accessToken, 'inbox', lastSyncDate, 'rebut');
    const sentMessages = await this.fetchMessagesFromFolder(accessToken, 'sentitems', lastSyncDate, 'enviat');
    return [...inboxMessages, ...sentMessages];
  }
/**
   * Funció privada per obtenir missatges d'una carpeta específica (entrada o sortida).
   * Gestiona la paginació de l'API de Microsoft Graph per obtenir tots els resultats.
   */
  private async fetchMessagesFromFolder(accessToken: string, folder: 'inbox' | 'sentitems', lastSyncDate: Date | null, type: 'rebut' | 'enviat'): Promise<NormalizedEmail[]> {
    let allMessages: any[] = [];
    let filterQuery = "";
    if (lastSyncDate) {
      filterQuery = `$filter=sentDateTime gt ${lastSyncDate.toISOString()}`;
    }
    const selectQuery = "$select=id,subject,body,bodyPreview,sentDateTime,from,sender,isRead";
    
    let url: string | null = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${filterQuery}&${selectQuery}&$top=50`;

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        console.error(`Error fetching from Microsoft ${folder}:`, await res.text());
        break;
      }
      const data = await res.json();
      allMessages = allMessages.concat(data.value || []);
      url = data['@odata.nextLink'] || null;
    }
    
    return allMessages.map(this.normalizeMicrosoftEmail(type));
  }
/**
   * Mètode privat que transforma un objecte de missatge de l'API de Microsoft
   * a la nostra estructura normalitzada 'NormalizedEmail'.
   */
  private normalizeMicrosoftEmail = (type: 'rebut' | 'enviat') => (msg: any): NormalizedEmail => {
    const sender = type === 'rebut' ? msg.from : msg.sender;
    return {
      provider_message_id: msg.id,
      subject: msg.subject || '(Sense assumpte)',
      body: msg.body?.content || '',
      preview: msg.bodyPreview || '',
      sent_at: new Date(msg.sentDateTime).toISOString(),
      sender_name: sender?.emailAddress?.name || 'Desconegut',
      sender_email: (sender?.emailAddress?.address || '').toLowerCase(),
      status: msg.isRead ? 'Llegit' : 'Obert',
      type: type,
    };
  }
}


// --- LÒGICA PER A GOOGLE (GMAIL API) ---

/**
 * Implementació de la interfície 'MailProvider' per a Google.
 * Conté tota la lògica específica per comunicar-se amb l'API de Gmail.
 */
class GoogleMailProvider implements MailProvider {
  private clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  private clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
// Funció utilitària per decodificar el format Base64URL que utilitza Gmail.
  private decodeBase64Url(base64Url: string): string {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return decodeURIComponent(
      Array.from(decoded).map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
  }
// Obté un nou 'access token' de curta durada.
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      throw new Error(`Google token refresh failed: ${await res.text()}`);
    }
    const tokens = await res.json();
    return tokens.access_token;
  }
/**
   * Mètode principal per obtenir nous missatges de Gmail.
   * Primer obté una llista d'IDs de missatges i després processa cada missatge individualment.
   */
  async getNewMessages(accessToken: string, lastSyncDate: Date | null): Promise<NormalizedEmail[]> {
    let gmailQuery = "-in:draft";
    if (lastSyncDate) {
      const lastSyncSeconds = Math.floor(lastSyncDate.getTime() / 1000);
      gmailQuery += ` after:${lastSyncSeconds}`;
    }

    let messageIds: { id: string, threadId: string }[] = [];
    let nextPageToken: string | undefined = undefined;
    const MAX_PAGES = 5; // Limitem pàgines per evitar timeouts
    let currentPage = 0;

    do {
      let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(gmailQuery)}`;
      if (nextPageToken) url += `&pageToken=${nextPageToken}`;
      
      const messagesRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const messagesData = await messagesRes.json();
      
      if (messagesData.messages) messageIds.push(...messagesData.messages);
      
      nextPageToken = messagesData.nextPageToken;
      currentPage++;
    } while (nextPageToken && currentPage < MAX_PAGES);

    // Processa totes les peticions de detall de missatge en paral·lel amb 'Promise.all' per a més rapidesa.
    const emailPromises = messageIds.map(msg => this.fetchAndNormalizeEmail(msg.id, accessToken));
    return (await Promise.all(emailPromises)).filter((email): email is NormalizedEmail => email !== null);
  }
  /**
   * Funció privada que obté el contingut complet d'un missatge a partir del seu ID
   * i el transforma a la nostra estructura 'NormalizedEmail'.
   */
  private async fetchAndNormalizeEmail(messageId: string, accessToken: string): Promise<NormalizedEmail | null> {
    try {
      const emailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!emailRes.ok) return null;

      const emailData = await emailRes.json();
      const payload = emailData.payload;
      const getHeader = (name: string) => payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      const fromHeader = getHeader("From");
      const fromEmail = (fromHeader.match(/<(.+)>/)?.[1] || fromHeader).toLowerCase();
      
      let body = "";
      const findPart = (parts: any[], mimeType: string): string | null => {
        for (const part of parts) {
          if (part.mimeType === mimeType && part.body?.data) return part.body.data;
          if (part.parts) {
            const found = findPart(part.parts, mimeType);
            if (found) return found;
          }
        }
        return null;
      };

      if (payload?.parts) {
        const html = findPart(payload.parts, "text/html");
        const text = findPart(payload.parts, "text/plain");
        body = html ? this.decodeBase64Url(html) : text ? this.decodeBase64Url(text) : "";
      } else if (payload?.body?.data) {
        body = this.decodeBase64Url(payload.body.data);
      }

      const isSent = emailData.labelIds?.includes("SENT");

      return {
        provider_message_id: emailData.id,
        subject: getHeader("Subject") || "(Sense assumpte)",
        body: body || emailData.snippet || "",
        preview: (body ? body.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim().substring(0, 150) : emailData.snippet || ""),
        sent_at: new Date(getHeader("Date") || Date.now()).toISOString(),
        sender_name: fromHeader.includes("<") ? fromHeader.split("<")[0].trim().replace(/"/g, "") : fromEmail,
        sender_email: fromEmail,
        status: emailData.labelIds?.includes("UNREAD") ? 'Obert' : 'Llegit',
        type: isSent ? 'enviat' : 'rebut',
      };
    } catch (err) {
      console.error(`[Google] Error processant el missatge ${messageId}:`, err);
      return null;
    }
  }
}


// --- FACTORY PER SELECCIONAR EL PROVEÏDOR ---

/**
 * Aquest és un patró de disseny "Factory". Donat un nom de proveïdor ('google' o 'azure'),
 * retorna la instància de la classe correcta.
 * Això fa que la funció principal sigui més neta i fàcil d'estendre amb nous proveïdors.
 */
function getMailProvider(provider: string): MailProvider {
  if (provider === 'google') return new GoogleMailProvider();
  if (provider === 'azure') return new MicrosoftMailProvider();
  throw new Error(`Proveïdor desconegut: ${provider}`);
}


// --- FUNCIÓ PRINCIPAL DEL SERVIDOR (EDGE FUNCTION) ---

/**
 * Aquesta és la funció principal de la Edge Function, el 'worker' de sincronització.
 * Orquestra tot el procés de sincronització de correus per a un usuari específic.
 * Aquesta funció pot ser cridada per un 'cron job' (Supabase Cron) o manualment.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let userId: string | null = null;
  try {
    const body = await req.json();
    userId = body.userId;
    if (!userId) throw new Error("Falta el paràmetre 'userId'.");

    // 1. Obtenir credencials i proveïdor de l'usuari
    const { data: creds, error: userError } = await supabaseAdmin
      .from("user_credentials")
      .select("refresh_token, provider")
      .eq("user_id", userId)
      .single();
    
    if (userError || !creds) throw new Error(`No s'han trobat credencials per a l'usuari ${userId}`);
    
    // 2. Seleccionar el proveïdor de correu correcte
    const mailProvider = getMailProvider(creds.provider);

    // 3. Obtenir l'última data de sincronització
    const { data: lastTicket } = await supabaseAdmin
      .from("tickets")
      .select("sent_at")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastSyncDate = lastTicket?.sent_at ? new Date(lastTicket.sent_at) : null;
    
    // 4. Obtenir un nou 'access token'
    const accessToken = await mailProvider.refreshAccessToken(creds.refresh_token);
    if (!accessToken) throw new Error(`No s'ha pogut obtenir l'access token per a ${userId}`);

    // 5. Obtenir la llista de nous correus de l'API corresponent
    const newEmails = await mailProvider.getNewMessages(accessToken, lastSyncDate);
    console.log(`[SYNC ${creds.provider.toUpperCase()}] ${newEmails.length} missatges nous trobats per a ${userId}`);
    if (newEmails.length === 0) {
       return new Response(JSON.stringify({ message: `No hi ha nous emails per sincronitzar per a ${userId}.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // 6. Obtenir la blacklist de l'usuari
    const { data: blacklistRules } = await supabaseAdmin.from('blacklist_rules').select('value').eq('user_id', userId);
    const userBlacklist = (blacklistRules || []).map(r => r.value);
    
    let processedCount = 0;
    
    // 7. Processar i inserir cada correu
    for (const email of newEmails) {
      try {
        // Comprovar si ja existeix
        const { data: exists } = await supabaseAdmin.from("tickets").select("id").eq("user_id", userId).eq("provider_message_id", email.provider_message_id).maybeSingle();
        if (exists) continue;

        // Comprovar blacklist
        const fromDomain = email.sender_email.split('@')[1];
        if (userBlacklist.some(item => email.sender_email.includes(item) || fromDomain?.includes(item))) {
            console.log(`[BLACKLIST] Ignorant email de ${email.sender_email}`);
            continue;
        }

        // Buscar contacte associat
        const { data: contact } = await supabaseAdmin.from('contacts').select('id').eq('user_id', userId).eq('email', email.sender_email).single();

        const { error: insertError } = await supabaseAdmin.from("tickets").insert({
          user_id: userId,
          contact_id: contact?.id,
          provider: creds.provider,
          provider_message_id: email.provider_message_id,
          subject: email.subject,
          body: email.body,
          preview: email.preview,
          status: email.status,
          type: email.type,
          sent_at: email.sent_at,
          sender_name: email.sender_name,
          sender_email: email.sender_email,
        });

        if (insertError) {
          console.error(`[ERROR INSERT] ${email.provider_message_id}:`, insertError);
        } else {
          processedCount++;
        }
      } catch (err) {
        console.error(`[Worker] Error processant el missatge ${email.provider_message_id}:`, err);
      }
    }

    return new Response(JSON.stringify({ message: `Sincronització completada per a ${userId}. ${processedCount} emails processats.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (err) {
    console.error(`[Worker Error General] (Usuari: ${userId || 'N/A'}):`, err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});