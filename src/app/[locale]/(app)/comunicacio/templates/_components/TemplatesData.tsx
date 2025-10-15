import { TemplatesClient } from './templates-client';
import type { EmailTemplate } from '../page';
import { validatePageSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció

export async function TemplatesData() {
    // ✅ 2. Validació de sessió que gestiona les redireccions.
    const { supabase } = await validatePageSession();

    // La RLS filtrarà automàticament per l'equip actiu.
    const { data: templates, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error en carregar les plantilles (pot ser per RLS):', error);
        // Si hi ha un error, retornem el component client amb dades buides per a mostrar un estat d'error.
        return <TemplatesClient initialTemplates={[]} />;
    }

    return (
        <TemplatesClient
            initialTemplates={
                templates
                    ? templates.map((t) => ({
                        ...t,
                        id: String(t.id),
                    })) as EmailTemplate[]
                    : []
            }
        />
    );
}