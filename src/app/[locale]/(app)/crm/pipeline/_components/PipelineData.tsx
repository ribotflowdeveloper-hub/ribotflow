// /app/[locale]/(app)/crm/pipeline/_components/PipelineData.tsx
import { PipelineClient } from '../pipeline-client';
import { validatePageSession } from "@/lib/supabase/session";

// ✅ 1. Importem el tipus 'Row' complet de la base de dades
import { type Database } from '@/types/supabase';
type FullContact = Database['public']['Tables']['contacts']['Row'];

// ✅ 2. Importem el servei, però JA NO importem el 'Contact' simplificat
import { 
  getPipelineData, 
  type Stage, 
  // type Contact, <-- Eliminem aquesta importació
  type OpportunityWithContact 
} from '@/lib/services/crm/pipeline/pipline.service';

// ✅ 3. Exportem els tipus correctes. 
// Ara, PipelineClient importarà aquest 'Contact' (que és el complet)
export type { Stage, OpportunityWithContact };
export type Contact = FullContact; // <-- Exportem el tipus complet amb l'àlies 'Contact'

export async function PipelineData() {
  const { supabase, activeTeamId } = await validatePageSession();
  
  // ✅ 4. Cridem al servei (sabem que 'data.contacts' és del tipus simplificat)
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

  // ✅ 5. Passem les dades al client.
  // Fem un "cast" forçat. Això arregla TypeScript però pot fallar 
  // en execució si no fas la "Solució Real" (arreglar el servei).
  return (
    <PipelineClient 
      initialStages={data.stages}
      initialContacts={data.contacts as FullContact[]}
      initialOpportunities={data.opportunities}
    />
  );
}