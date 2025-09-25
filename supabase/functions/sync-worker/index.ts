// supabase/functions/sync-worker/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient} from "https://esm.sh/@supabase/supabase-js@2";

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
    const expandQuery = "$expand=attachments";

    let url: string | null = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${filterQuery}&${selectQuery}&${expandQuery}&$top=50`;

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
  // Dins de la classe MicrosoftMailProvider

  private normalizeMicrosoftEmail = (type: 'rebut' | 'enviat') => (msg: any): NormalizedEmail => {
    const sender = type === 'rebut' ? msg.from : msg.sender;
    let body = msg.body?.content || '';

    // ✅ NOU: Lògica per reemplaçar les imatges CID
    if (body && msg.attachments && msg.attachments.length > 0) {
      const inlineAttachments = msg.attachments.filter((att: any) => att.isInline);
      for (const attachment of inlineAttachments) {
        const cid = attachment.contentId;
        const contentType = attachment.contentType;
        const base64Data = attachment.contentBytes; // Microsoft ja ens el dóna en Base64

        if (cid && contentType && base64Data) {
          const dataUri = `data:${contentType};base64,${base64Data}`;
          const cidRegex = new RegExp(`cid:${cid}`, "g");
          body = body.replace(cidRegex, dataUri);
        }
      }
    }

    return {
      provider_message_id: msg.id,
      subject: msg.subject || '(Sense assumpte)',
      body: body, // 🔄 MODIFICAT: Ara 'body' conté les imatges!
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
      // 🔄 MODIFICAT: Afegim una capçalera per a les crides addicionals
      const authHeader = { Authorization: `Bearer ${accessToken}` };

      const emailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: authHeader
      });
      if (!emailRes.ok) return null;

      const emailData = await emailRes.json();
      const payload = emailData.payload;
      const getHeader = (name: string) => payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      // ✅ NOU: Pas 1 - Crear un mapa per guardar les imatges CID
      const cidMap = new Map<string, string>();
      const attachmentPromises: Promise<void>[] = [];

      // ✅ NOU: Pas 2 - Funció recursiva per trobar adjunts incrustats
      const findInlineAttachments = (parts: any[]) => {
        for (const part of parts) {
          const contentIdHeader = part.headers?.find((h: any) => h.name.toLowerCase() === 'content-id');
          if (contentIdHeader && part.body?.attachmentId) {
            const contentId = contentIdHeader.value.replace(/[<>]/g, ""); // Netejem el <...>
            const mimeType = part.mimeType;
            const attachmentId = part.body.attachmentId;

            // Creem una promesa per obtenir les dades de l'adjunt
            const promise = fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, { headers: authHeader })
              .then(res => res.json())
              .then(attachment => {
                if (attachment.data) {
                  const base64Data = attachment.data.replace(/-/g, '+').replace(/_/g, '/');
                  cidMap.set(contentId, `data:${mimeType};base64,${base64Data}`);
                }
              });
            attachmentPromises.push(promise);
          }
          // Busquem recursivament en parts anidades
          if (part.parts) {
            findInlineAttachments(part.parts);
          }
        }
      };

      if (payload?.parts) {
        findInlineAttachments(payload.parts);
      }

      // ✅ NOU: Pas 3 - Esperar que totes les imatges es descarreguin en paral·lel
      await Promise.all(attachmentPromises);

      let body = "";
      const findPart = (parts: any[], mimeType: string): string | null => {
        // ... (aquesta funció auxiliar es manté igual)
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

      // ✅ NOU: Pas 4 - Reemplaçar les referències CID a l'HTML amb les dades Base64
      if (body && cidMap.size > 0) {
        for (const [cid, dataUri] of cidMap.entries()) {
          const cidRegex = new RegExp(`cid:${cid}`, "g");
          body = body.replace(cidRegex, dataUri);
        }
      }

      const fromHeader = getHeader("From");
      const fromEmail = (fromHeader.match(/<(.+)>/)?.[1] || fromHeader).toLowerCase();
      const isSent = emailData.labelIds?.includes("SENT");

      return {
        provider_message_id: emailData.id,
        subject: getHeader("Subject") || "(Sense assumpte)",
        body: body || emailData.snippet || "", // 🔄 MODIFICAT: Ara 'body' conté les imatges!
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
  if (provider === 'microsoft') return new MicrosoftMailProvider();
  throw new Error(`Proveïdor desconegut: ${provider}`);
}


// --- FUNCIÓ PRINCIPAL DEL SERVIDOR (EDGE FUNCTION) ---

/**
 * Versió final del worker que gestiona correctament la sincronització multi-equip.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
      const body = await req.json();
      const { userId, provider } = body;

      if (!userId || !provider) throw new Error("Falten paràmetres 'userId' o 'provider'.");

      // Obtenim TOTES les credencials d'aquest usuari per a aquest proveïdor.
      // Un usuari pot haver connectat el seu Gmail a múltiples equips.
      const { data: credentials, error: credsError } = await supabaseAdmin
          .from("user_credentials")
          .select("refresh_token, team_id")
          .eq("user_id", userId)
          .eq("provider", provider);

      if (credsError) throw credsError;
      if (!credentials || credentials.length === 0) {
          return new Response(JSON.stringify({ message: `No s'han trobat credencials per a ${userId} i ${provider}.` }), { status: 200, headers: corsHeaders });
      }

      // Iterem per cada connexió (cada equip on l'usuari ha connectat la seva bústia)
      for (const cred of credentials) {
          if (!cred.team_id || !cred.refresh_token) {
              console.warn(`Saltant credencial invàlida per a l'usuari ${userId}`);
              continue;
          }

          const { refresh_token, team_id } = cred;
          console.log(`[WORKER] Iniciant sincronització per a usuari: ${userId}, equip: ${team_id}`);

          const mailProvider = getMailProvider(provider);

          // Busquem l'últim tiquet per a AQUESTA BÚSTIA i AQUEST EQUIP
          const { data: lastTicket } = await supabaseAdmin
              .from("tickets")
              .select("sent_at")
              .eq("team_id", team_id)
              .eq("user_id", userId)
              .eq("provider", provider)
              .order("sent_at", { ascending: false })
              .limit(1)
              .maybeSingle();
          const lastSyncDate = lastTicket?.sent_at ? new Date(lastTicket.sent_at) : null;

          const accessToken = await mailProvider.refreshAccessToken(refresh_token);
          const newEmails = await mailProvider.getNewMessages(accessToken, lastSyncDate);

          if (newEmails.length === 0) {
              console.log(`[SYNC ${provider.toUpperCase()}] No hi ha missatges nous per a l'equip ${team_id}`);
              continue; // Passem a la següent credencial
          }

          for (const email of newEmails) {
              try {
                  // ✅ COMPROVACIÓ DE DUPLICATS CORRECTA
                  // Ara mirem si el missatge ja existeix dins d'aquest equip específic.
                  const { data: exists } = await supabaseAdmin
                      .from("tickets")
                      .select("id")
                      .eq("team_id", team_id)
                      .eq("provider_message_id", email.provider_message_id)
                      .maybeSingle();

                  if (exists) continue;

                  const { data: contact } = await supabaseAdmin.from('contacts').select('id').eq('team_id', team_id).eq('email', email.sender_email).maybeSingle();
                  
                  await supabaseAdmin.from("tickets").insert({
                      user_id: userId,
                      team_id: team_id,
                      contact_id: contact?.id,
                      provider: provider,
                      provider_message_id: email.provider_message_id,
                      subject: email.subject,
                      body: email.body,
                      preview: email.preview,
                      status: email.status,
                      type: email.type,
                      sent_at: email.sent_at,
                      sender_name: email.sender_name,
                      sender_email: email.sender_email,
                  }).throwOnError();
              } catch (err) {
                  console.error(`[Worker] Error processant el missatge ${email.provider_message_id}:`, err.message);
              }
          }
      }
      
      return new Response(JSON.stringify({ message: "Sincronització completada." }), { status: 200, headers: corsHeaders });

  } catch (err) {
      console.error(`[Worker Error General]:`, err.message);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});