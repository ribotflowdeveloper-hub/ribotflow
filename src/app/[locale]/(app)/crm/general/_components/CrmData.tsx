// /app/[locale]/crm/_components/CrmData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CrmClient } from './crm-client';
import { CrmData as CrmDataType } from '../page';

export async function CrmData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <CrmClient initialData={null} />;
    }

    // --- LÒGICA D'EQUIP ---
    // La nostra lògica estàndard per assegurar-nos que l'usuari té un equip actiu.
    // No cal passar cap paràmetre; la funció RPC ho llegirà del token.
    const { data: claimsString, error: claimsError } = await supabase.rpc('get_current_jwt_claims');
    if (claimsError || !claimsString) {
        redirect('/settings/team'); // Redirigim si hi ha error
    }
    const claims = JSON.parse(claimsString);
    if (!claims.app_metadata?.active_team_id) {
        redirect('/settings/team'); // Redirigim si no hi ha equip actiu
    }
    // -----------------------

    // ✅ CRIDEM A LA NOVA FUNCIÓ RPC SENSE PARÀMETRES
    const { data, error } = await supabase.rpc('get_crm_dashboard_data');
    
    if (error) {
        console.error('Error fetching CRM dashboard data:', error);
        return <CrmClient initialData={null} />;
    }

    // El resultat ja és l'objecte JSON que necessita el client.
    return <CrmClient initialData={data as CrmDataType} />;
}