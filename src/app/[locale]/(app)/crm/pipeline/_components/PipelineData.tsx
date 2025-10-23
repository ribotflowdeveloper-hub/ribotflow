// /app/[locale]/(app)/crm/pipeline/_components/PipelineData.tsx (Corregit)

import { PipelineClient } from '../pipeline-client';
import { validatePageSession } from "@/lib/supabase/session";
import { type Database } from '@/types/supabase';

// ✅ 1. Les definicions de tipus es mantenen igual. Són correctes i escalables.
export type Stage = Database['public']['Tables']['pipeline_stages']['Row'];
export type Contact = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'>;
export type OpportunityWithContact = Database['public']['Tables']['opportunities']['Row'] & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'> | null;
};

export async function PipelineData() {
    // ✅ 2. Obtenim la sessió validada, que inclou l'activeTeamId.
    const { supabase, activeTeamId } = await validatePageSession();
    
    // ✅ 3. Modifiquem les consultes per filtrar explícitament per 'activeTeamId'.
    // Aquesta és la correcció clau per assegurar que només es carreguen les dades de l'equip actiu.
    const [stagesRes, contactsRes, opportunitiesRes] = await Promise.all([
        supabase
            .from('pipeline_stages')
            .select('id, name, position')
           .eq('team_id', activeTeamId) // ⬅️ CORRECCIÓ: Filtrem les etapes per equip.
            .order('position', { ascending: true }),
        supabase
            .from('contacts')
            .select('id, nom')
           .eq('team_id', activeTeamId), // ⬅️ CORRECCIÓ: Filtrem els contactes per equip.
        supabase
            .from('opportunities')
            .select('*, contacts(id, nom)')
           .eq('team_id', activeTeamId)  // ⬅️ CORRECCIÓ: Filtrem les oportunitats per equip.
    ]);
    
    // Els logs d'errors es mantenen per a una bona depuració.
    if (stagesRes.error) console.error("Error en carregar etapes (RLS?):", stagesRes.error);
    if (contactsRes.error) console.error("Error en carregar contactes (RLS?):", contactsRes.error);
    if (opportunitiesRes.error) console.error("Error en carregar oportunitats (RLS?):", opportunitiesRes.error);

    // ✅ 4. El "casting" de tipus continua sent segur.
    const stages = (stagesRes.data as Stage[]) || [];
    const contacts = (contactsRes.data as Contact[]) || [];
    const opportunities = (opportunitiesRes.data as OpportunityWithContact[]) || [];

    return (
        <PipelineClient 
            initialStages={stages}
            initialContacts={contacts}
            initialOpportunities={opportunities}
        />
    );
}