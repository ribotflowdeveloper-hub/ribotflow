import { PipelineClient } from '../pipeline-client';
import { validatePageSession } from "@/lib/supabase/session";
import type { SupabaseClient } from '@supabase/supabase-js';

// ✅ Importem els tipus que necessitarem
import type { Contact, Pipeline, Stage } from '@/types/db'; // Importa 'Pipeline' de la BBDD
import {
  getPipelineData,

  type OpportunityWithContact
} from '@/lib/services/crm/pipeline/pipline.service';

/**
 * Funció per obtenir la llista de pipelines
 */
export async function getPipelinesList(supabase: SupabaseClient, teamId: string) {
  return supabase
    .from('pipelines')
    .select('*') // Mantenim el select('*') que ja havíem corregit
    .eq('team_id', teamId)
    .order('position');
}

// Exportem tots els tipus perquè el client els pugui fer servir
export type { Stage, OpportunityWithContact, Contact, Pipeline };

interface PipelineDataProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

/**
 * Server Component principal per a la pàgina de Pipeline.
 */
export async function PipelineData({ searchParams }: PipelineDataProps) {
  const { supabase, activeTeamId } = await validatePageSession();

  // --- 1. Obtenir llista de pipelines ---
  const { data: pipelines, error: pipelinesError } = await getPipelinesList(supabase, activeTeamId);

  // ✅ CORRECCIÓ: Separem la gestió d'errors de la gestió d'estat buit.

  // CAS 1: Hi ha un error REAL de la BBDD (RLS falla, connexió, etc.)
  if (pipelinesError) {
    console.error("Error crític en carregar pipelines:", pipelinesError.message);
    return (
      <PipelineClient
        initialPipelines={[]}
        activePipelineId={null}
        initialStages={[]}
        initialContacts={[]}
        initialOpportunities={[]}
      />
    );
  }

  // CAS 2: No hi ha error, però no hi ha pipelines (equip nou, o RLS ha filtrat tot)
  if (!pipelines || pipelines.length === 0) {
    // Això no és un error, és un estat buit.
    console.log("No s'han trobat pipelines per a aquest equip. Mostrant estat buit.");
    // TODO: Retornar una vista "Crea el teu primer pipeline"
    return (
      <PipelineClient
        initialPipelines={[]}
        activePipelineId={null}
        initialStages={[]}
        initialContacts={[]}
        initialOpportunities={[]}
      />
    );
  }

  // --- 2. Determinar pipeline actiu ---
  const pipelineIdFromUrl = searchParams.pipeline ? parseInt(searchParams.pipeline as string, 10) : null;
  const activePipeline =
    (pipelineIdFromUrl ? pipelines.find(p => p.id === pipelineIdFromUrl) : null) ||
    pipelines[0]; // Per defecte, el primer de la llista

  // Si tot i així no tenim un pipeline actiu (situació estranya), sortim.
  if (!activePipeline) {
     console.warn("No s'ha pogut determinar un pipeline actiu tot i tenir-ne a la llista.");
     return (
        <PipelineClient
          initialPipelines={pipelines}
          activePipelineId={null}
          initialStages={[]}
          initialContacts={[]}
          initialOpportunities={[]}
        />
     )
  }

  const activePipelineId = activePipeline.id;

  // --- 3. Carregar dades del pipeline actiu ---
  const { data, error } = await getPipelineData(supabase, activeTeamId, activePipelineId);

  if (error || !data) {
    console.error(`Error en carregar les dades del pipeline ${activePipelineId} (Component):`, error);
    // Mostrem el client amb les dades del pipeline (encara que les dades internes hagin fallat)
    return (
      <PipelineClient
        initialPipelines={pipelines}
        activePipelineId={activePipelineId}
        initialStages={[]}
        initialContacts={[]}
        initialOpportunities={[]}
      />
    );
  }

  // --- 4. Passar-ho tot al client ---
  return (
    <PipelineClient
      initialPipelines={pipelines}
      activePipelineId={activePipelineId}
      initialStages={data.stages}
      initialContacts={data.contacts}
      initialOpportunities={data.opportunities}
    />
  );
}