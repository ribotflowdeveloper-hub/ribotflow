import { CustomizationClient } from './CustomizationClient';
import { validatePageSession } from '@/lib/supabase/session'; // ✅ 1. Importem l'assistent
import type { Stage, Tag } from '../page';

export async function CustomizationData() {
    // ✅ 2. Validació de sessió neta i centralitzada
    const { supabase } = await validatePageSession();

    const [stagesRes, tagsRes] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name').order('position'),
        supabase.from('contact_tags').select('id, name, color')
    ]);

    // ✅ 3. Gestió d'errors més robusta
    if (stagesRes.error || tagsRes.error) {
        console.error('Error en carregar dades de personalització:', stagesRes.error || tagsRes.error);
        // Això activarà el fitxer error.tsx més proper a la ruta
        throw new Error("No s'han pogut carregar les dades de personalització. Intenta-ho de nou més tard.");
    }

    return <CustomizationClient 
        initialStages={(stagesRes.data as Stage[]) || []} 
        initialTags={(tagsRes.data as Tag[]) || []} 
    />;
}