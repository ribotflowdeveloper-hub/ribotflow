import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

export async function getDepartments(
  supabase: SupabaseClient<Database>, 
  teamId: string
) {
  return supabase
    .from('departments')
    .select('*')
    .eq('team_id', teamId);
}