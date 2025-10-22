// supabase/functions/sync-worker/_providers/microsoft.ts
import type { MailProvider, NormalizedEmail } from './base.ts';

// --- Definició de tipus per a l'API de Microsoft Graph ---
interface MSEmailAddress {
  emailAddress: {
    name: string | null;
    address: string | null;
  } | null;
}

interface MSGraphEmail {
  id: string;
  subject: string | null;
  body: {
    content: string | null;
  } | null;
  bodyPreview: string | null;
  sentDateTime: string;
  from: MSEmailAddress | null;
  sender: MSEmailAddress | null;
  isRead: boolean;
  // '@odata.nextLink' no és part de l'email, sinó de la resposta de la llista
}

interface MSGraphEmailListResponse {
  value: MSGraphEmail[];
  '@odata.nextLink'?: string;
}
// --- Fi de la definició de tipus ---


export class MicrosoftMailProvider implements MailProvider {
  clientId = Deno.env.get("AZURE_CLIENT_ID");
  clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
  tenantId = Deno.env.get("MICROSOFT_TENANT_ID") || "common";

  async refreshAccessToken(refreshToken: string) {
    const res = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/.default'
      })
    });
    if (!res.ok) throw new Error(`Microsoft token refresh failed: ${await res.text()}`);
    const tokens = await res.json();
    return tokens.access_token;
  }

  async getNewMessages(accessToken: string, lastSyncDate: Date | null): Promise<NormalizedEmail[]> {
    const inbox = this.fetchMessagesFromFolder(accessToken, 'inbox', lastSyncDate, 'rebut');
    const sent = this.fetchMessagesFromFolder(accessToken, 'sentitems', lastSyncDate, 'enviat');
    
    const results = await Promise.allSettled([inbox, sent]);
    
    return results
      .filter((result): result is PromiseFulfilledResult<NormalizedEmail[]> => result.status === 'fulfilled')
      .flatMap((result) => result.value);
  }

  async fetchMessagesFromFolder(accessToken: string, folder: string, lastSyncDate: Date | null, type: 'rebut' | 'enviat'): Promise<NormalizedEmail[]> {
    // ✅ CORRECCIÓ: Utilitzem el tipus que hem definit
    let allMessages: MSGraphEmail[] = [];
    
    const params = new URLSearchParams({
      $select: "id,subject,body,bodyPreview,sentDateTime,from,sender,isRead,attachments",
      $top: "50"
    });

    if (lastSyncDate) {
      params.set('$filter', `sentDateTime gt ${lastSyncDate.toISOString()}`);
    }

    let url: string | null = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${params.toString()}`;

    while (url) {
      const res: Response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!res.ok) {
        console.error(`Error fetching from Microsoft ${folder}:`, await res.text());
        break;
      }
      
      // Tipem la resposta
      const data = await res.json() as MSGraphEmailListResponse;
      
      if (data.value) {
        allMessages = allMessages.concat(data.value);
      }
      
      url = data['@odata.nextLink'] || null;
    }

    return allMessages.map(this.normalizeMicrosoftEmail(type));
  }

  // ✅ CORRECCIÓ: Substituïm 'any' per 'MSGraphEmail'
  normalizeMicrosoftEmail = (type: 'rebut' | 'enviat') => (msg: MSGraphEmail): NormalizedEmail => {
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
      type: type
    };
  };
}