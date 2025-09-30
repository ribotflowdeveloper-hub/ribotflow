import { PipelineClient } from '../pipeline-client';
import type { Stage, Contact, Opportunity } from '../page';
import { validatePageSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció d'ajuda per a pàgines

export async function PipelineData() {
    // ✅ 2. Validem la sessió. Si no és vàlida, aquesta funció redirigirà automàticament
    // i l'execució d'aquest component s'aturarà aquí.
    const { supabase } = await validatePageSession();
    
    // Si arribem aquí, sabem que la sessió és vàlida. Podem carregar les dades.
    // Les polítiques RLS s'encarregaran de filtrar les dades per a l'equip actiu.
    const [stagesRes, contactsRes, opportunitiesRes] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name, position').order('position', { ascending: true }),
        supabase.from('contacts').select('id, nom'),
        supabase.from('opportunities').select('*, contacts(id, nom)')
    ]);
    
    if (stagesRes.error) console.error("Error en carregar etapes (RLS?):", stagesRes.error);
    if (contactsRes.error) console.error("Error en carregar contactes (RLS?):", contactsRes.error);
    if (opportunitiesRes.error) console.error("Error en carregar oportunitats (RLS?):", opportunitiesRes.error);

    const stages = (stagesRes.data as Stage[]) || [];
    const contacts = (contactsRes.data as Contact[]) || [];
    const opportunities = (opportunitiesRes.data as Opportunity[]) || [];

    return (
        <PipelineClient 
            initialStages={stages}
            initialContacts={contacts}
            initialOpportunities={opportunities}
        />
    );
}