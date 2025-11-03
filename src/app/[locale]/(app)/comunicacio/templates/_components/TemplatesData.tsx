// src/app/[locale]/(app)/comunicacio/templates/_components/TemplatesData.tsx
import { TemplatesClient } from './templates-client';
import { validatePageSession } from "@/lib/supabase/session";

// ✅ 1. Importem el nostre nou servei
import * as templatesService from '@/lib/services/comunicacio/templates.service';

// ✅ 2. Importem el tipus correcte des de la font de la veritat
import type { EmailTemplate } from '@/types/db';

export async function TemplatesData() {
    const { supabase, activeTeamId } = await validatePageSession();

    let templates: EmailTemplate[] = [];

    try {
        // ✅ 3. Cridem al servei per obtenir les dades
        templates = await templatesService.getTemplates(supabase, activeTeamId);
    } catch (error) {
        console.error((error as Error).message);
        // Retornem el client amb dades buides en cas d'error
        return <TemplatesClient initialTemplates={[]} />;
    }

    // ✅ 4. Passem les dades directament. 
    // No cal mapar 'id' a string. El 'TemplatesClient' haurà d'acceptar 'id: number'.
    return (
        <TemplatesClient initialTemplates={templates} />
    );
}