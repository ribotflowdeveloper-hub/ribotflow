// /app/[locale]/(app)/crm/pipeline/_components/PipelineData.tsx (Refactoritzat)

import { PipelineClient } from '../pipeline-client';
import { validatePageSession } from "@/lib/supabase/session";
import { type Database } from '@/types/supabase';

// ✅ 1. Definim els tipus necessaris a partir de la base de dades.

// Tipus per a una etapa del pipeline.
export type Stage = Database['public']['Tables']['pipeline_stages']['Row'];
// Tipus per a un contacte, només amb les dades que necessitem.
export type Contact = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'>;
// Tipus per a una oportunitat, enriquida amb la informació del contacte associat.
export type OpportunityWithContact = Database['public']['Tables']['opportunities']['Row'] & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'> | null;
};

export async function PipelineData() {
    const { supabase } = await validatePageSession();
    
    // ✅ 2. Les consultes es mantenen, però ara sabem que els tipus són els correctes.
    const [stagesRes, contactsRes, opportunitiesRes] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name, position').order('position', { ascending: true }),
        supabase.from('contacts').select('id, nom'),
        supabase.from('opportunities').select('*, contacts(id, nom)')
    ]);
    
    if (stagesRes.error) console.error("Error en carregar etapes (RLS?):", stagesRes.error);
    if (contactsRes.error) console.error("Error en carregar contactes (RLS?):", contactsRes.error);
    if (opportunitiesRes.error) console.error("Error en carregar oportunitats (RLS?):", opportunitiesRes.error);

    // ✅ 3. Passem les dades al client amb els tipus correctes, utilitzant 'as' de manera segura.
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