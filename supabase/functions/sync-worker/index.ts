// supabase/functions/sync-worker/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- TIPUS I INTERFÍCIES COMUNES ---

/**
 * Representa les dades d'un correu normalitzades, independentment del proveïdor.
 */
interface NormalizedEmail {
  provider_message_id: string;
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
 * Interfície que ha de complir cada proveïdor de correu.
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

// Inicialització del client de Supabase (una sola vegada)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


// --- LÒGICA PER A MICROSOFT (GRAPH API) ---

class MicrosoftMailProvider implements MailProvider {
  private clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
  private clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
  private tenantId = Deno.env.get("MICROSOFT_TENANT_ID") || "common";

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

  async getNewMessages(accessToken: string, lastSyncDate: Date | null): Promise<NormalizedEmail[]> {
    const inboxMessages = await this.fetchMessagesFromFolder(accessToken, 'inbox', lastSyncDate, 'rebut');
    const sentMessages = await this.fetchMessagesFromFolder(accessToken, 'sentitems', lastSyncDate, 'enviat');
    return [...inboxMessages, ...sentMessages];
  }

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

class GoogleMailProvider implements MailProvider {
  private clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  private clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  private decodeBase64Url(base64Url: string): string {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return decodeURIComponent(
      Array.from(decoded).map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
  }

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

    // Processar cada missatge en paral·lel per eficiència
    const emailPromises = messageIds.map(msg => this.fetchAndNormalizeEmail(msg.id, accessToken));
    return (await Promise.all(emailPromises)).filter((email): email is NormalizedEmail => email !== null);
  }
  
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

function getMailProvider(provider: string): MailProvider {
  if (provider === 'google') return new GoogleMailProvider();
  if (provider === 'azure') return new MicrosoftMailProvider();
  throw new Error(`Proveïdor desconegut: ${provider}`);
}


// --- FUNCIÓ PRINCIPAL DEL SERVIDOR (EDGE FUNCTION) ---

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