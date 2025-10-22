// supabase/functions/sync-worker/_lib/db.ts
import { supabaseAdmin } from './supabase.ts';
import type { NormalizedEmail } from '../_providers/base.ts';

export async function getLastSyncDate(userId: string, provider: string): Promise<Date | null> {
  const { data: lastTicket } = await supabaseAdmin
    .from("tickets")
    .select("sent_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return lastTicket?.sent_at ? new Date(lastTicket.sent_at) : null;
}

export async function saveEmailsAsTickets(emails: NormalizedEmail[], userId: string, provider: string) {
  const ticketsToInsert = emails.map((email) => ({
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
    sender_email: email.sender_email
  }));

  // Utilitzem .upsert() per evitar duplicats
  const { error: upsertError } = await supabaseAdmin
    .from("tickets")
    .upsert(ticketsToInsert, {
      onConflict: 'user_id,provider_message_id',
      ignoreDuplicates: true
    });
    
  if (upsertError) {
    // Aquest error només saltarà si és un problema diferent a un duplicat.
    throw upsertError;
  }
  
  console.log(`[DB] S'han processat ${emails.length} tiquets. Els nous s'han inserit.`);
}