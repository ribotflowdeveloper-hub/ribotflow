import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TemplatesClient } from './templates-client';
import type { EmailTemplate } from '../page';

export async function TemplatesData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // Comprovació de seguretat: si l'usuari no té un equip actiu, no pot veure plantilles.
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return redirect('/settings/team');
    }

    // ✅ CONSULTA SIMPLIFICADA: RLS filtrarà automàticament per l'equip actiu.
    const { data: templates, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error en carregar les plantilles (pot ser per RLS):', error);
    }

    return <TemplatesClient initialTemplates={(templates as EmailTemplate[]) || []} />;
}