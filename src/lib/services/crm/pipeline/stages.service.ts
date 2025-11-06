import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

export async function getPipelineStages(
  supabase: SupabaseClient<Database>, 
  pipelineId: number // ✅ Filtrem per 'pipelineId'
) {
  return supabase
    .from('pipeline_stages')
    .select('id, name, position, color') // ✅ AFEGIM 'color'
    // ✅ CORRECCIÓ: Filtrem per 'pipeline_id' en lloc de 'team_id'
    // La seguretat RLS ja s'ocupa que només puguem veure les del nostre equip
    // si la política RLS de 'pipeline_stages' també comprova 'team_id'.
    // Si la política RLS de 'pipeline_stages' NO comprova 'team_id' (perquè es fia
    // de la de 'pipelines'), llavors no cal 'teamId' aquí.
    // Però si la política de 'pipeline_stages' diu 'team_id = auth.uid()',
    // necessitem afegir el filtre de 'team_id'
    .eq('pipeline_id', pipelineId)
    // .eq('team_id', teamId) // Descomenta si la teva RLS ho requereix
    .order('position', { ascending: true });
}