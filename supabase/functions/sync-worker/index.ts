// supabase/functions/sync-worker/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- TIPUS I INTERFÍCIES ---
interface NormalizedEmail {
    provider_message_id: string;
    subject: string;
    body: string;
    preview: string;
    sent_at: string;
    sender_name: string;
    sender_email: string;
    status: 'NoLlegit' | 'Llegit';
    type: 'rebut' | 'enviat';
}
type OAuthCredentials = string;
type ImapCredentials = { config: any; encryptedPassword: string; };
interface MailProvider {
  refreshAccessToken?(refreshToken: string): Promise<string>;
  getNewMessages(credentials: OAuthCredentials | ImapCredentials, lastSyncDate: Date | null): Promise<NormalizedEmail[]>;
}

// --- CONFIGURACIÓ GLOBAL ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// --- LÒGICA PER A MICROSOFT ---
class MicrosoftMailProvider implements MailProvider {
  private clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  private clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
  private tenantId = Deno.env.get("MICROSOFT_TENANT_ID") || "common";

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const res = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId, client_secret: this.clientSecret,
        refresh_token: refreshToken, grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/.default',
      }),
    });
    if (!res.ok) throw new Error(`Microsoft token refresh failed: ${await res.text()}`);
    const tokens = await res.json();
    return tokens.access_token;
  }

  async getNewMessages(accessToken: OAuthCredentials, lastSyncDate: Date | null): Promise<NormalizedEmail[]> {
    const inbox = this.fetchMessagesFromFolder(accessToken, 'inbox', lastSyncDate, 'rebut');
    const sent = this.fetchMessagesFromFolder(accessToken, 'sentitems', lastSyncDate, 'enviat');
    // Utilitzem Promise.allSettled per evitar que un error en una bústia impedeixi l'altra
    const results = await Promise.allSettled([inbox, sent]);
    return results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<NormalizedEmail[]>).value);
  }

  private async fetchMessagesFromFolder(accessToken: string, folder: string, lastSyncDate: Date | null, type: 'rebut' | 'enviat'): Promise<NormalizedEmail[]> {
    let allMessages: any[] = [];
    const params = new URLSearchParams({
      $select: "id,subject,body,bodyPreview,sentDateTime,from,sender,isRead,attachments",
      $top: "50",
    });
    if (lastSyncDate) {
      params.set('$filter', `sentDateTime gt ${lastSyncDate.toISOString()}`);
    }
    let url: string | null = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${params.toString()}`;
    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
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
      status: msg.isRead ? 'Llegit' : 'NoLlegit',
      type: type,
    };
  };
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

    const messageIds: { id: string, threadId: string }[] = [];
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
        status: emailData.labelIds?.includes("UNREAD") ? 'NoLlegit' : 'Llegit', // ✅ CANVI
        type: isSent ? 'enviat' : 'rebut',
      };
    } catch (err) {
      console.error(`[Google] Error processant el missatge ${messageId}:`, err);
      return null;
    }
  }
}

// Aquesta és la nova classe que truca a la nostra API de Next.js
class CustomMailProvider implements MailProvider {
    async getNewMessages(credentials: ImapCredentials, lastSyncDate: Date | null): Promise<NormalizedEmail[]> {
        const { config, encryptedPassword } = credentials;

        const apiUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL");
        if (!apiUrl) {
            throw new Error("La variable NEXT_PUBLIC_SITE_URL no està configurada a la Edge Function.");
        }
        const functionsSecret = Deno.env.get("FUNCTIONS_SECRET");
        if (!functionsSecret) {
            throw new Error("La variable FUNCTIONS_SECRET no està configurada a la Edge Function.");
        }

        console.log(`[IMAP Worker] Cridant a l'API externa: ${apiUrl}/api/sync-imap`);

        const response = await fetch(`${apiUrl}/api/sync-imap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${functionsSecret}`
            },
            body: JSON.stringify({
                config,
                encryptedPassword,
                lastSyncDate
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error cridant a l'API de sync-imap: ${errorBody.error || response.statusText}`);
        }

        return await response.json();
    }
}

// FACTORY (ara amb els tres proveïdors)
function getMailProvider(provider: string): MailProvider {
    if (provider === 'google') return new GoogleMailProvider();
    if (provider === 'microsoft') return new MicrosoftMailProvider();
    if (provider === 'custom_email') return new CustomMailProvider() as unknown as MailProvider;
    throw new Error(`Proveïdor desconegut: ${provider}`);
}

// --- FUNCIÓ PRINCIPAL ---
serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const body: { userId: string; provider: string; } = await req.json();
        const { userId, provider } = body;
        if (!userId || !provider) throw new Error("Falten paràmetres 'userId' o 'provider'.");

        console.log(`[WORKER] Iniciant sincronització per a: ${userId}, proveïdor: ${provider}`);
        const mailProvider = getMailProvider(provider);
        let credentialsForProvider: OAuthCredentials | ImapCredentials;

        if (provider === 'google' || provider === 'microsoft') {
            const { data, error } = await supabaseAdmin.from("user_credentials").select("refresh_token").eq("user_id", userId).eq("provider", provider).maybeSingle();
            if (error) throw error;
            if (!data?.refresh_token) return new Response(JSON.stringify({ message: `No s'han trobat credencials OAuth per a ${userId}.` }), { status: 200, headers: corsHeaders });
            
            if (!mailProvider.refreshAccessToken) throw new Error(`El proveïdor ${provider} no té el mètode refreshAccessToken.`);
            credentialsForProvider = await mailProvider.refreshAccessToken(data.refresh_token);

        } else if (provider === 'custom_email') {
            const { data, error } = await supabaseAdmin.from("user_credentials").select("config, encrypted_password").eq("user_id", userId).eq("provider", "custom_email").maybeSingle();
            if (error) throw error;
            if (!data?.config || !data.encrypted_password) return new Response(JSON.stringify({ message: `No s'han trobat credencials IMAP per a ${userId}.` }), { status: 200, headers: corsHeaders });
            
            // Ja no desencriptem aquí. Passem les credencials directament a l'API Route.
            credentialsForProvider = {
                config: data.config,
                encryptedPassword: data.encrypted_password,
            };
        } else {
            throw new Error(`La lògica per al proveïdor ${provider} no està implementada.`);
        }

        const { data: lastTicket } = await supabaseAdmin.from("tickets").select("sent_at").eq("user_id", userId).eq("provider", provider).order("sent_at", { ascending: false }).limit(1).maybeSingle();
        const lastSyncDate: Date | null = lastTicket?.sent_at ? new Date(lastTicket.sent_at) : null;
        
        const newEmails: NormalizedEmail[] = await mailProvider.getNewMessages(credentialsForProvider, lastSyncDate);

        if (newEmails.length === 0) {
            console.log(`[SYNC ${provider.toUpperCase()}] No hi ha missatges nous.`);
            return new Response(JSON.stringify({ message: "Sincronització completada, sense missatges nous." }), { status: 200, headers: corsHeaders });
        }
        
        console.log(`[SYNC ${provider.toUpperCase()}] S'han trobat ${newEmails.length} missatges nous.`);

    // ✅ INICI DE LA LÒGICA DE LA BLACKLIST

    // 1. Obtenim tots els equips als quals pertany l'usuari
    const { data: userTeams }: { data: TeamMember[] | null } = await supabaseAdmin.from('team_members').select('team_id').eq('user_id', userId);
    const userTeamIds: string[] = userTeams?.map((t: TeamMember) => t.team_id) || [];

    let userBlacklistSet: Set<string> = new Set<string>();
    if (userTeamIds.length > 0) {
      // 2. Obtenim totes les regles de la blacklist per a aquests equips
      const { data: blacklistRules }: { data: BlacklistRule[] | null } = await supabaseAdmin
        .from('blacklist_rules')
        .select('value')
        .in('team_id', userTeamIds);

      userBlacklistSet = new Set(blacklistRules?.map((rule: BlacklistRule) => rule.value));
    }

    // 3. Filtrem els emails nous, descartant els que estan a la llista negra
    const validEmails: NormalizedEmail[] = newEmails.filter((email: NormalizedEmail) => !userBlacklistSet.has(email.sender_email));

    if (validEmails.length === 0) {
      console.log(`[Worker] Tots els ${newEmails.length} missatges nous per a l'usuari ${userId} estaven a la llista negra.`);
      return new Response(JSON.stringify({ message: "Sincronització completada, tots els missatges han estat filtrats." }), { status: 200, headers: corsHeaders });
    }
    console.log(`[Worker] Dels ${newEmails.length} missatges, ${validEmails.length} són vàlids i seran inserits.`);

    // ✅ FI DE LA LÒGICA DE LA BLACKLIST
    const ticketsToInsert: TicketsToInsert[] = newEmails.map((email: NormalizedEmail) => ({
      user_id: userId,
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
    }));

    // ✅ CANVI CLAU: Utilitzem .upsert() en lloc de .insert()
    // Això insereix les files noves i ignora les que ja existeixen (duplicats).
    const { error: upsertError }: { error: unknown } = await supabaseAdmin
      .from("tickets")
      .upsert(ticketsToInsert, {
        onConflict: 'user_id,provider_message_id', // Li diem quina és la restricció UNIQUE a comprovar
        ignoreDuplicates: true, // Li diem que ignori els duplicats en lloc de donar error
      });

    if (upsertError) {
      // Aquest error només saltarà si és un problema diferent a un duplicat.
      throw upsertError;
    }

    console.log(`[Worker] S'han processat ${newEmails.length} tiquets per a ${userId}. Els nous s'han inserit.`);
    return new Response(JSON.stringify({ message: "Sincronització completada." }), { status: 200, headers: corsHeaders });

  } catch (err: unknown) {
    const errorMessage = typeof err === 'object' && err !== null && 'message' in err ? (err as { message: string }).message : String(err);
    console.error(`[Worker Error General]:`, errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders });
  }
});