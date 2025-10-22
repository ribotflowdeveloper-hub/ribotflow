// supabase/functions/sync-worker/_providers/base.ts
export interface NormalizedEmail {
  provider_message_id: string;
  subject: string;
  body: string;
  preview: string;
  sent_at: string; // ISO String
  sender_name: string;
  sender_email: string;
  status: 'Llegit' | 'NoLlegit';
  type: 'rebut' | 'enviat';
}

export interface MailProvider {
  // Mètode opcional per a proveïdors OAuth
  refreshAccessToken?(refreshToken: string): Promise<string>;

  // Mètode principal
  getNewMessages(credentials: unknown, lastSyncDate: Date | null): Promise<NormalizedEmail[]>;
}