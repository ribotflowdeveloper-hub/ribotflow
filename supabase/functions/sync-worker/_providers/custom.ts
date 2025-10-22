// supabase/functions/sync-worker/_providers/custom.ts
import type { MailProvider, NormalizedEmail } from './base.ts';

interface CustomMailCredentials {
  config: unknown;
  encryptedPassword: string;
}

export class CustomMailProvider implements MailProvider {
  async getNewMessages(credentials: CustomMailCredentials, lastSyncDate: Date | null): Promise<NormalizedEmail[]> {
    const { config, encryptedPassword } = credentials;
    
    const apiUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL");
    if (!apiUrl) throw new Error("Variable NEXT_PUBLIC_SITE_URL no configurada a la Edge Function.");
    
    const functionsSecret = Deno.env.get("FUNCTIONS_SECRET");
    if (!functionsSecret) throw new Error("Variable FUNCTIONS_SECRET no configurada a la Edge Function.");

    console.log(`[WORKER-IMAP] Cridant a l'API Route: ${apiUrl}/api/sync-imap`);
    
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

    console.log(`[WORKER-IMAP] Resposta rebuda de l'API Route. Status: ${response.status}`);
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        error: `Error no-JSON amb status ${response.status}`
      }));
      throw new Error(`Error de l'API de sync-imap: ${errorBody.error}`);
    }

    const emails = await response.json();
    console.log(`[WORKER-IMAP] S'han rebut ${emails.length} correus des de l'API Route.`);
    return emails;
  }
}