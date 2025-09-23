import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { CrmClient } from './crm-client';
import { CrmData as CrmDataType } from '../page';

export async function CrmData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    // Si no hi ha usuari, no podem continuar
    if (!user) {
        return <CrmClient initialData={null} />;
    }

    // --- LÒGICA D'EQUIP ---
    // 1. Busquem l'equip de l'usuari actual.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

    if (memberError || !member) {
        console.error("Error: L'usuari no pertany a cap equip.", memberError);
        return <CrmClient initialData={null} />;
    }
    const teamId = member.team_id;
    // -----------------------

    // ✅ CRIDEM A LA NOVA FUNCIÓ RPC, PASSANT-LI EL teamId
    const { data, error } = await supabase.rpc('get_crm_dashboard_data_for_team', {
        p_team_id: teamId
    });
    
    if (error) {
        console.error('Error fetching CRM dashboard data for team:', error);
        return <CrmClient initialData={null} />;
    }

    // El resultat de la funció RPC és un únic objecte JSON, no un array
    return <CrmClient initialData={data as CrmDataType} />;
}
