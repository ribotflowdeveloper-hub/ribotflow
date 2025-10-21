import { CustomizationClient } from './CustomizationClient';
import { validatePageSession } from '@/lib/supabase/session';
// ✅ 1. Importem els tipus directament de la definició de la BD
import { type Database } from '@/types/supabase';

// ✅ 2. Definim els tipus basats en les taules
type PipelineStageRow = Database['public']['Tables']['pipeline_stages']['Row'];
type ContactTagRow = Database['public']['Tables']['contact_tags']['Row'];


export async function CustomizationData() {
    const { supabase } = await validatePageSession();

    // Consultes (sense canvis)
    const [stagesRes, tagsRes] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name, position').order('position'), // Afegim position si no hi era
        supabase.from('contact_tags').select('id, name, color')
    ]);

    if (stagesRes.error || tagsRes.error) {
        console.error('Error en carregar dades de personalització:', stagesRes.error || tagsRes.error);
        throw new Error("No s'han pogut carregar les dades de personalització. Intenta-ho de nou més tard.");
    }

    // ✅ 3. Fem servir els tipus Row correctes per al cast
    return <CustomizationClient
        initialStages={(stagesRes.data as PipelineStageRow[]) || []}
        initialTags={(tagsRes.data as ContactTagRow[]) || []}
    />;
}