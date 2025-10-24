import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

// 1. El tipus de dada es defineix al servei, que és el "contracte"
export type ActivityWithContact = Database['public']['Tables']['activities']['Row'] & {
  contacts: Database['public']['Tables']['contacts']['Row'] | null;
};

/**
 * Obté totes les activitats d'un equip, enriquides amb la informació del contacte.
 */
export async function getActivities(
  supabase: SupabaseClient<Database>, 
  teamId: string
): Promise<{ data: ActivityWithContact[] | null; error: PostgrestError | null }> {
  
  const { data, error } = await supabase
    .from('activities')
    .select('*, contacts(*)')
    .eq('team_id', teamId) // ⬅️ CORRECCIÓ DE SEGURETAT: Filtrem per equip
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error in getActivities (service):", error.message);
    return { data: null, error };
  }
  
  // 2. El 'casting' de tipus es fa dins del servei
  return { data: data as ActivityWithContact[], error: null };
}