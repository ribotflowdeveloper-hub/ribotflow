import { getTranslations } from 'next-intl/server';
import { NetworkClient } from './NetworkClient';
// ✅ 1. Importem l'acció que SÍ utilitza l'admin client
import { getNetworkMapDataAction } from '../actions';
// ✅ 2. Importem els tipus correctes (que retorna l'acció)
// ✅ 3. Importem la validació d'usuari (per saber QUI és l'usuari)
import { validateUserSession } from '@/lib/supabase/session';

export async function NetworkData() {
    console.log("[NetworkData] Iniciant càrrega de dades del mapa.");
    const t = await getTranslations('NetworkPage');
    
    try {
        // ✅ 4. Cridem l'ACCIÓ correcta (la que utilitza l'admin client)
        // i en paral·lel mirem si l'usuari està loguejat
        const [mapData, session] = await Promise.all([
            getNetworkMapDataAction(),
            validateUserSession() 
        ]);

        const userTeamId = ('error' in session) ? null : session.activeTeamId;

        console.log(`[NetworkData] Dades carregades: ${mapData.teams.length} equips, ${mapData.jobs.length} projectes.`);

        // ✅ 5. Passem els nous tipus (MapTeam[], MapJobPosting[]) al client
        return (
            <NetworkClient 
                initialTeams={mapData.teams} 
                initialJobs={mapData.jobs} 
                userTeamId={userTeamId} // Passem l'ID de l'equip de l'usuari
            />
        );

    } catch (error) {
        console.error('Error a NetworkData:', (error as Error).message);
        return (
            <NetworkClient 
                initialTeams={[]} 
                initialJobs={[]} 
                userTeamId={null}
                errorMessage={t('errorLoading')} 
            />
        );
    }
}