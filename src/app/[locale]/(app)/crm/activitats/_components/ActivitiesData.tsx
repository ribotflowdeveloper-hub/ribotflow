import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ActivitatsClient } from './activitats-client';

// Aquest és un Server Component asíncron que fa la feina pesada.
export async function ActivitiesData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    // Si no hi ha usuari, no podem continuar.
    if (!user) {
        return <ActivitatsClient initialActivities={[]} />;
    }

    // --- APLICANT LA LÒGICA D'EQUIP ---
    // 1. Busquem a quin equip pertany l'usuari actual.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

    // Si l'usuari no pertany a cap equip, no tindrà activitats per veure.
    if (memberError || !member) {
        console.error("L'usuari no pertany a cap equip.", memberError);
        return <ActivitatsClient initialActivities={[]} />;
    }
    const teamId = member.team_id;
    // ------------------------------------

    // ✅ Modifiquem la consulta per filtrar per 'team_id'
    const { data: activities, error } = await supabase
        .from('activities')
        .select('*, contacts(nom)')
        .eq('team_id', teamId) // <-- EL FILTRE CLAU
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching activities:", error.message);
        return <ActivitatsClient initialActivities={[]} />;
    }

    return <ActivitatsClient initialActivities={activities || []} />;
}
