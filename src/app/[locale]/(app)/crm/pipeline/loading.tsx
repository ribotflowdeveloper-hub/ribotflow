// /app/[locale]/(app)/crm/pipeline/loading.tsx (Refactoritzat)

import { PipelineSkeleton } from './_components/PipelineSkeleton';
import { createClient } from '@/lib/supabase/server';
// ✅ 1. Importem la definició de la base de dades.
import { type Database } from '@/types/supabase';

// ✅ 2. Definim el tipus Stage a partir de la taula corresponent.
type Stage = Database['public']['Tables']['pipeline_stages']['Row'];

export default async function PipelineLoading() {
    const supabase = createClient();
    
    const { data: stagesData } = await supabase
        .from('pipeline_stages')
        .select('id, name, position');

    // ✅ 3. El cast ara utilitza el tipus correcte.
    const stages = (stagesData as Stage[]) || [];

    return <PipelineSkeleton stages={stages} viewMode="columns" />;
}