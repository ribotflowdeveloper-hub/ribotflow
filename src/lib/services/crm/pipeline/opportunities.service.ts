import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

export async function getOpportunitiesWithContact(supabase: SupabaseClient<Database>, teamId: string) {
  return supabase
    .from('opportunities')
    .select('*, contacts(id, nom)')
    .eq('team_id', teamId);
}