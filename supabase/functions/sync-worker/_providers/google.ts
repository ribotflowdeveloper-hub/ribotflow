// supabase/functions/sync-worker/_providers/google.ts
import type { MailProvider, NormalizedEmail } from './base.ts';

// --- Definició de tipus per a l'API de Gmail ---

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePartBody {
  attachmentId?: string;
  data?: string;
  size: number;
}

// Un 'part' pot contenir més 'parts' (recursivitat)
interface GmailMessagePart {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body?: GmailMessagePartBody; // El body pot no estar present en parts 'multipart'
  parts?: GmailMessagePart[];
}

// El 'payload' és estructuralment idèntic a un 'part'
type GmailPayload = GmailMessagePart;

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload: GmailPayload;
}

interface GmailMessageListResponse {
  messages: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

interface GmailAttachment {
  data: string;
  size: number;
}
// --- Fi de la definició de tipus ---


export class GoogleMailProvider implements MailProvider {
  clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  decodeBase64Url(base64Url: string) {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return decodeURIComponent(Array.from(decoded).map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
  }

  async refreshAccessToken(refreshToken: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
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

    const messageIds: { id: string }[] = [];
    let nextPageToken: string | undefined = undefined;
    const MAX_PAGES = 5; 
    let currentPage = 0;

    do {
      let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(gmailQuery)}`;
      if (nextPageToken) url += `&pageToken=${nextPageToken}`;
      
      const messagesRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      // ✅ CORRECCIÓ: Tipem la resposta de l'API
      const messagesData = await messagesRes.json() as GmailMessageListResponse;
      
      if (messagesData.messages) messageIds.push(...messagesData.messages);
      nextPageToken = messagesData.nextPageToken;
      currentPage++;
    } while (nextPageToken && currentPage < MAX_PAGES);

    const emailPromises = messageIds.map((msg) => this.fetchAndNormalizeEmail(msg.id, accessToken));
    const emails = await Promise.all(emailPromises);
    return emails.filter((email): email is NormalizedEmail => email !== null);
  }

  async fetchAndNormalizeEmail(messageId: string, accessToken: string): Promise<NormalizedEmail | null> {
    try {
      const authHeader = { Authorization: `Bearer ${accessToken}` };
      const emailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: authHeader
      });

      if (!emailRes.ok) return null;
      
      // ✅ CORRECCIÓ: Tipem la resposta de l'API
      const emailData = await emailRes.json() as GmailMessage;
      const payload = emailData.payload;
      
      // ✅ CORRECCIÓ: Tipem el paràmetre 'h'
      const getHeader = (name: string) => payload?.headers?.find((h: GmailHeader) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      const cidMap = new Map<string, string>();
      const attachmentPromises: Promise<void>[] = [];

      // ✅ CORRECCIÓ: Tipem el paràmetre 'parts'
      const findInlineAttachments = (parts: GmailMessagePart[]) => {
        for (const part of parts) {
          // ✅ CORRECCIÓ: Tipem el paràmetre 'h'
          const contentIdHeader = part.headers?.find((h: GmailHeader) => h.name.toLowerCase() === 'content-id');
          if (contentIdHeader && part.body?.attachmentId) {
            const contentId = contentIdHeader.value.replace(/[<>]/g, "");
            const mimeType = part.mimeType;
            const attachmentId = part.body.attachmentId;
            
            const promise = fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
              headers: authHeader
            })
            // ✅ CORRECCIÓ: Tipem la resposta de l'adjunt
            .then(async (res) => {
              const attachment = await res.json() as GmailAttachment;
              if (attachment.data) {
                const base64Data = attachment.data.replace(/-/g, '+').replace(/_/g, '/');
                cidMap.set(contentId, `data:${mimeType};base64,${base64Data}`);
              }
            });
            attachmentPromises.push(promise);
          }
          if (part.parts) {
            findInlineAttachments(part.parts);
          }
        }
      };

      if (payload?.parts) {
        findInlineAttachments(payload.parts);
      }

      await Promise.all(attachmentPromises);

      let body = "";
      // ✅ CORRECCIÓ: Tipem el paràmetre 'parts'
      const findPart = (parts: GmailMessagePart[], mimeType: string): string | null => {
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
        body: body || emailData.snippet || "",
        preview: body ? body.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim().substring(0, 150) : emailData.snippet || "",
        sent_at: new Date(getHeader("Date") || Date.now()).toISOString(),
        sender_name: fromHeader.includes("<") ? fromHeader.split("<")[0].trim().replace(/"/g, "") : fromEmail,
        sender_email: fromEmail,
        status: emailData.labelIds?.includes("UNREAD") ? 'NoLlegit' : 'Llegit',
        type: isSent ? 'enviat' : 'rebut'
      };
    } catch (err) {
      console.error(`[Google] Error processant el missatge ${messageId}:`, err);
      return null;
    }
  }
}