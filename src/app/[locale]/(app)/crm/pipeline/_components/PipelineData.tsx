import { PipelineClient } from '../pipeline-client';
import { validatePageSession } from "@/lib/supabase/session";
// ✅ 1. Importem el *servei* i els *tipus* que aquest exposa
import { 
  getPipelineData, 
  type Stage, 
  type Contact, 
  type OpportunityWithContact 
} from '@/lib/services/crm/pipeline/pipline.service'; // Ruta al nou servei

// ✅ 2. Exportem els tipus perquè el Client Component (PipelineClient) els pugui inferir
export type { Stage, Contact, OpportunityWithContact };

export async function PipelineData() {
  // ✅ 3. El component manté la responsabilitat de validar la sessió
  const { supabase, activeTeamId } = await validatePageSession();
  
  // ✅ 4. Cridem la nostra capa de servei centralitzada.
  // Tota la complexitat de la consulta (Promise.all, filtres) està amagada.
  const { data, error } = await getPipelineData(supabase, activeTeamId);

  // ✅ 5. Gestionem l'error a alt nivell
  if (error || !data) {
    console.error("Error en carregar les dades del pipeline (Component):", error);
    // Retornem el client buit per a un 'graceful failure'
    return (
      <PipelineClient 
        initialStages={[]}
        initialContacts={[]}
        initialOpportunities={[]}
      />
    );
  }

  // ✅ 6. Passem les dades netes al component client
  return (
    <PipelineClient 
      initialStages={data.stages}
      initialContacts={data.contacts}
      initialOpportunities={data.opportunities}
    />
  );
}