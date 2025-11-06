import { validatePageSession } from "@/lib/supabase/session";
import { type Database } from "@/types/supabase";
import { SettingsPipelinesClient } from "./SettingsPipelinesClient";

type Pipeline = Database['public']['Tables']['pipelines']['Row'];

// ✅ INICI DE LA CORRECCIÓ
// El teu tipus 'Stage' generat (de 'supabase.ts') està desactualitzat.
// No inclou 'color' ni 'stage_type'.
// Aquest tipus 'StageOverride' ho corregeix manualment,
// dient-li a TypeScript que esperi aquestes propietats.
type StageOverride = Database['public']['Tables']['pipeline_stages']['Row'] & {
  color: string | null;
  stage_type: string | null;
};

// El nostre tipus enriquit ara utilitza el tipus corregit
export type PipelineWithStages = Pipeline & {
  pipeline_stages: StageOverride[]; // <-- Usem l'Override
};
// ✅ FI DE LA CORRECCIÓ


/**
 * Carrega TOTS els pipelines i les seves etapes associades per a l'equip actiu.
 */
async function getPipelinesAndStages(
  teamId: string
): Promise<PipelineWithStages[]> {
  const { supabase } = await validatePageSession();

  const { data, error } = await supabase
    .from('pipelines')
    .select(`
      *,
      pipeline_stages (
        id,
        name,
        position,
        color,
        stage_type
      )
    `)
    .eq('team_id', teamId)
    .order('position', { ascending: true }) // Ordena els pipelines
    .order('position', { foreignTable: 'pipeline_stages', ascending: true }); // Ordena les etapes

  if (error) {
    console.error("Error en carregar pipelines i etapes:", error);
    return [];
  }
  
  // Gràcies a 'StageOverride', TypeScript ja no eliminarà 'color' ni 'stage_type'.
  return data as unknown as PipelineWithStages[];
}

export async function SettingsPipelinesData() {
  const { activeTeamId } = await validatePageSession();
  const pipelinesWithStages = await getPipelinesAndStages(activeTeamId);

  return <SettingsPipelinesClient initialData={pipelinesWithStages} />;
}