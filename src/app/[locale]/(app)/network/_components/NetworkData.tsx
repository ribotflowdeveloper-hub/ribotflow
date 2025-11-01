// /app/[locale]/network/_components/NetworkData.tsx

import { createClient } from '@/lib/supabase/server';
import { NetworkClient } from './NetworkClient';
import { getTranslations } from 'next-intl/server';
import type { PublicProfileListItem, JobPostingListItem } from '../types'; // Importem el nou tipus

/**
 * Obté les dades dels perfils (equips) de la BDD.
 */
async function getProfiles(supabase: ReturnType<typeof createClient>) {
    const { data, error } = await supabase
        .from('teams')
        .select(`
            id,
            name,
            sector,
            logo_url,
            latitude,
            longitude
        `); // Afegeix .eq('is_public', true) si tens aquesta columna

    if (error) {
        console.error('Error al carregar la llista de perfils:', error.message);
        throw new Error('Error al carregar perfils');
    }
    return (data as PublicProfileListItem[]) || [];
}

/**
 * Obté les dades dels projectes (job_postings) oberts.
 * Aquesta funció fa un JOIN amb la taula 'teams' per agafar el nom i el logo.
 */
async function getJobPostings(supabase: ReturnType<typeof createClient>) {
    // La política RLS de SELECT s'aplica automàticament aquí.
    // Només retornarà els 'job_postings' amb status = 'open'.
    const { data, error } = await supabase
        .from('job_postings')
        .select(`
            id,
            title,
            latitude,
            longitude,
            address_text,
            team_id,
            teams ( name, logo_url )
        `)
        .eq('status', 'open'); // Doble seguretat (encara que RLS ja ho fa)

    if (error) {
        console.error('Error al carregar la llista de projectes:', error.message);
        throw new Error('Error al carregar projectes');
    }
    return (data as JobPostingListItem[]) || [];
}


export async function NetworkData() {
    const t = await getTranslations('NetworkPage');
    const supabase = createClient();

    try {
        // Carreguem les dues fonts de dades en paral·lel
        const [profiles, jobPostings] = await Promise.all([
            getProfiles(supabase),
            getJobPostings(supabase)
        ]);

        return <NetworkClient profiles={profiles} jobPostings={jobPostings} />;

    } catch (error) {
        console.error('Error a NetworkData:', (error as Error).message);
        return <NetworkClient profiles={[]} jobPostings={[]} errorMessage={t('errorLoading')} />;
    }
}