// /app/[locale]/(app)/crm/activitats/_components/ActivitiesData.tsx

import { createClient } from '@/lib/supabase/server';
import { ActivitatsClient } from './activitats-client';
import { Database } from '@/types/supabase'; // ✅ Importem la definició principal

// ✅ PAS 1: Definim el tipus que representa el resultat EXACTE de la nostra consulta.
// És una fila de 'activities' enriquida amb una fila (o null) de 'contacts'.
export type ActivityWithContact = Database['public']['Tables']['activities']['Row'] & {
  contacts: Database['public']['Tables']['contacts']['Row'] | null;
};

export async function ActivitiesData() {
    const supabase = createClient();
    
    // ✅ La consulta ara demana TOTES les columnes de 'contacts' amb (*)
    const { data: activities, error } = await supabase
        .from('activities')
        .select('*, contacts(*)') // Canviem de 'contacts(nom, email)' a 'contacts(*)' per consistència
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error en obtenir les activitats (pot ser per RLS):", error.message);
        return <ActivitatsClient initialActivities={[]} />;
    }

    // ✅ PAS 2: Passem les dades directament, sense transformar-les.
    // Utilitzem 'as' perquè TypeScript no pot inferir el tipus de la relació 'contacts(*)'
    // Aquest patró és segur perquè hem definit 'ActivityWithContact' per a aquest propòsit.
    return <ActivitatsClient initialActivities={activities as ActivityWithContact[]} />;
}