import { CrmClient } from './crm-client';
import { CrmData as CrmDataType } from '../page';
import { validatePageSession } from '@/lib/supabase/session'; // ✅ 1. Importem la nostra funció

export async function CrmData() {
    // ✅ 2. TOTA la lògica de validació anterior es substitueix per aquesta crida.
    // Aquesta funció ja gestiona les redireccions si l'usuari no està logat o no té equip actiu.
    const { supabase } = await validatePageSession();

    // ✅ 3. Ara podem cridar directament a la nostra funció RPC per obtenir les dades del dashboard.
    // La funció RPC utilitzarà internament l'active_team_id del token de l'usuari.
    const { data, error } = await supabase.rpc('get_crm_dashboard_data');
    
    if (error) {
        console.error('Error fetching CRM dashboard data:', error);
        // Si la funció RPC falla, mostrem el client amb dades nul·les, que mostrarà un error.
        return <CrmClient initialData={null} />;
    }

    // El resultat ja és l'objecte JSON que necessita el client.
    return <CrmClient initialData={data as CrmDataType} />;
}