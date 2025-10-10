// /app/[locale]/crm/activitats/_components/ActivitiesData.tsx

import { createClient } from '@/lib/supabase/server';
import { ActivitatsClient } from './activitats-client';
import type { Activity } from '@/types/crm';

export async function ActivitiesData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <ActivitatsClient initialActivities={[]} />;
    }

    // --- LÒGICA D'EQUIP ANTIGA ELIMINADA ---
    // Ja no necessitem buscar l'equip manualment a 'team_members'.
    // La política RLS ho gestionarà tot de manera automàtica i segura.
    // ------------------------------------

    // ✅ La consulta ara és més simple. No inclou el filtre '.eq('team_id', teamId)'
    // perquè la política de seguretat de la base de dades s'encarregarà d'afegir-lo.
    const { data: activities, error } = await supabase
        .from('activities')
        .select('*, contacts(nom)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error en obtenir les activitats (pot ser per RLS):", error.message);
        return <ActivitatsClient initialActivities={[]} />;
    }

    return <ActivitatsClient initialActivities={activities as Activity[] || []} />;
}