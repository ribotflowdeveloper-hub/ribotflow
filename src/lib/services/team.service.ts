import { type SupabaseClient} from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

export async function getTeamMembers(
  supabase: SupabaseClient<Database>, 
  teamId: string
) {
  // Retornem la consulta directament; la gestió d'errors es farà al servei orquestrador
  return supabase
    .from('team_members_with_profiles')
    .select('user_id, full_name')
    .eq('team_id', teamId);
}