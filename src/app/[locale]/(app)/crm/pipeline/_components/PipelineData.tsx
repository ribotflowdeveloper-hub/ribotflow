// /app/[locale]/crm/pipeline/_components/PipelineData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { PipelineClient } from '../pipeline-client';
import type { Stage, Contact, Opportunity } from '../page';

export async function PipelineData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return <PipelineClient initialStages={[]} initialContacts={[]} initialOpportunities={[]} />;
    }

    // --- NOVA LÒGICA D'EQUIP ACTIU ---
    // Obtenim l'equip actiu real des del token per evitar problemes de memòria cau.
    const { data: claimsString, error: claimsError } = await supabase.rpc('get_current_jwt_claims');

    if (claimsError || !claimsString) {
        console.error("Error crític en obtenir els claims del token:", claimsError);
        return <PipelineClient initialStages={[]} initialContacts={[]} initialOpportunities={[]} />;
    }

    const claims = JSON.parse(claimsString);
    const activeTeamId = claims.app_metadata?.active_team_id;

    if (!activeTeamId) {
        return <PipelineClient initialStages={[]} initialContacts={[]} initialOpportunities={[]} />;
    }
    // ------------------------------------

    // ✅ Les consultes ara són simples. La RLS s'encarregarà de filtrar per 'team_id' a les tres taules.
    const [stagesRes, contactsRes, opportunitiesRes] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name, position').order('position', { ascending: true }),
        supabase.from('contacts').select('id, nom'),
        supabase.from('opportunities').select('*, contacts(id, nom)')
    ]);
    
    // La gestió d'errors es manté igual, però ara un error podria indicar un problema de RLS.
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