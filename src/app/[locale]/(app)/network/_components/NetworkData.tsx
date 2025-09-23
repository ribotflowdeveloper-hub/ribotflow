// /app/[locale]/network/_components/NetworkData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NetworkClient } from './NetworkClient';
import { getTranslations } from 'next-intl/server';
import type { PublicProfileListItem } from '../types';

export async function NetworkData() {
    const t = await getTranslations('NetworkPage');
    const supabase = createClient(cookies());

    // Consulta simple per a la llista inicial. Només les dades bàsiques.
    const { data, error } = await supabase
        .from('teams')
        .select(`
            id,
            name,
            sector,
            logo_url,
            latitude,
            longitude
        `);

    if (error) {
        console.error('Error al carregar la llista de perfils:', error.message);
        return <NetworkClient profiles={[]} errorMessage={t('errorLoading')} />;
    }

    const profiles = (data as PublicProfileListItem[]) || [];

    return <NetworkClient profiles={profiles} />;
}