// /app/[locale]/(app)/crm/pipeline/_components/PipelineData.tsx
import { PipelineClient } from '../pipeline-client';
import { validatePageSession } from "@/lib/supabase/session";

// ✅ 1. Importem el tipus 'Row' complet de la base de dades
// ✅ 2. Importem el tipus COMPLET des de la nostra font de la veritat (db.ts)
import type { Contact } from '@/types/db';

import { 
  getPipelineData, 
  type Stage, 
  type OpportunityWithContact 
} from '@/lib/services/crm/pipeline/pipline.service';

// ✅ 3. Exportem els tipus correctes. 
export type { Stage, OpportunityWithContact, Contact }; // Exportem el 'Contact' complet

export async function PipelineData() {
  const { supabase, activeTeamId } = await validatePageSession();
  
  const { data, error } = await getPipelineData(supabase, activeTeamId);

  if (error || !data) {
    console.error("Error en carregar les dades del pipeline (Component):", error);
    return (
      <PipelineClient 
        initialStages={[]}
        initialContacts={[]}
        initialOpportunities={[]}
      />
    );
  }

  // ✅ 4. Ja no cal fer un "cast" forçat. 
// 'data.contacts' ara és realment el tipus 'Contact[]' complet.
  return (
    <PipelineClient 
      initialStages={data.stages}
      initialContacts={data.contacts} 
      initialOpportunities={data.opportunities}
    />
  );
}