import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { CrmClient } from './crm-client';
import { CrmData as CrmDataType } from '../page';

export async function CrmData() {
    const supabase = createClient(cookies())
;

    const { data, error } = await supabase.rpc('get_crm_dashboard_data');
    
    if (error) {
        console.error('Error fetching CRM dashboard data:', error);
        // Podem passar null per a que el client mostri un error
        return <CrmClient initialData={null} />;
    }

    return <CrmClient initialData={data as CrmDataType} />;
}