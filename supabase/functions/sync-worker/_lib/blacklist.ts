// supabase/functions/sync-worker/_lib/blacklist.ts
import { supabaseAdmin } from './supabase.ts';
import type { NormalizedEmail } from '../_providers/base.ts';

export async function filterBlacklistedEmails(emails: NormalizedEmail[], userId: string): Promise<NormalizedEmail[]> {
  // 1. Obtenim tots els equips als quals pertany l'usuari
  const { data: userTeams } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);
  
  const userTeamIds = userTeams?.map((t: { team_id: string }) => t.team_id) || [];
  
  // Si no pertany a cap equip, no cal filtrar
  if (userTeamIds.length === 0) {
    return emails;
  }

  // 2. Obtenim totes les regles de la blacklist per a aquests equips
  const { data: blacklistRules } = await supabaseAdmin
    .from('blacklist_rules')
    .select('value')
    .in('team_id', userTeamIds);
    
  const userBlacklistSet = new Set(blacklistRules?.map((rule: { value: string }) => rule.value));

  // Si no hi ha regles, no cal filtrar
  if (userBlacklistSet.size === 0) {
    return emails;
  }

  // 3. Filtrem els emails nous
  const validEmails = emails.filter((email) => !userBlacklistSet.has(email.sender_email));
  
  console.log(`[Blacklist] Dels ${emails.length} missatges, ${validEmails.length} són vàlids i seran inserits.`);
  return validEmails;
}