import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CustomizationClient } from './CustomizationClient';
import type { Stage, Tag } from '../page';

export async function CustomizationData() {
    const supabase = createClient(cookies());

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // Comprovació de seguretat: si l'usuari no té un equip actiu, no pot personalitzar res.
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return redirect('/settings/team');
    }

    // La RLS filtrarà automàticament per l'equip actiu.
    const [stagesRes, tagsRes] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name').order('position'),
        // ✅ CORRECCIÓ: Utilitzem el nom de taula correcte 'contact_tags'
        supabase.from('contact_tags').select('id, name, color')
    ]);

    if (stagesRes.error) {
        console.error('Error en carregar les etapes del pipeline:', stagesRes.error);
    }
    if (tagsRes.error) {
        console.error('Error en carregar les etiquetes:', tagsRes.error);
    }

    return <CustomizationClient 
        initialStages={(stagesRes.data as Stage[]) || []} 
        initialTags={(tagsRes.data as Tag[]) || []} 
    />;
}