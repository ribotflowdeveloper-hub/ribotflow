import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { PipelineClient } from '../pipeline-client';
import type { Stage, Contact, Opportunity } from '../page';

// Aquest Server Component carrega TOTES les dades de l'equip per al pipeline
export async function PipelineData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return <PipelineClient initialStages={[]} initialContacts={[]} initialOpportunities={[]} />;
    }

    // 1. Busquem l'equip de l'usuari actual.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

    if (memberError || !member) {
        console.error("L'usuari no pertany a cap equip.", memberError);
        return <PipelineClient initialStages={[]} initialContacts={[]} initialOpportunities={[]} />;
    }
    const teamId = member.team_id;

    // ✅ Modifiquem TOTES les consultes per filtrar per 'team_id'
    const [stagesRes, contactsRes, opportunitiesRes] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name, position').eq('team_id', teamId).order('position', { ascending: true }),
        supabase.from('contacts').select('id, nom').eq('team_id', teamId),
        supabase.from('opportunities').select('*, contacts(id, nom)').eq('team_id', teamId)
    ]);
    
    if (stagesRes.error) console.error("Error en carregar etapes:", stagesRes.error);
    if (contactsRes.error) console.error("Error en carregar contactes:", contactsRes.error);
    if (opportunitiesRes.error) console.error("Error en carregar oportunitats:", opportunitiesRes.error);

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

