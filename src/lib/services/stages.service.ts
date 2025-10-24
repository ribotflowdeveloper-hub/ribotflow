import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

export async function getPipelineStages(supabase: SupabaseClient<Database>, teamId: string) {
  return supabase
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('team_id', teamId)
    .order('position', { ascending: true });
}