// src/app/[locale]/(app)/dashboard/_components/DashboardData.tsx

import React from 'react';
import { validatePageSession } from '@/lib/supabase/session';
import { DashboardClient } from '../dashboard-client';

// ✅ 1. Importem el nostre SERVEI principal
import { getDashboardInitialData } from '@/lib/services/dashboard/dashboard.service';

// ✅ 2. Importem els tipus que el CLIENT necessitarà (ara sí que s'exporten)
import type { 
    DashboardInitialData, 
    EnrichedTask, 
    EnrichedQuote, 
    EnrichedEmail 
} from '@/lib/services/dashboard/dashboard.service';
import type { Tables } from '@/types/supabase';

// ✅ 3. Re-exportem els tipus per al DashboardClient
export type { 
    DashboardInitialData, 
    EnrichedTask, 
    EnrichedQuote, 
    EnrichedEmail 
};
export type TeamMember = Tables<'team_members_with_profiles'>;

// ✅ 4. CORRECCIÓ: Creem un objecte de dades buit per als casos d'error
// Això satisfà el 'DashboardClient' que no accepta 'null'.
const defaultEmptyData: DashboardInitialData = {
    stats: {
        totalContacts: 0, activeClients: 0, opportunities: 0, invoiced: 0,
        pending: 0, expenses: 0, invoicedChange: '0%', expensesChange: '0%',
        invoicedIsPositive: true, expensesIsPositive: true,
    },
    tasks: [],
    departments: [],
    contacts: [],
    overdueInvoices: [],
    attentionContacts: [],
    notifications: [],
    recentActivities: [],
    recentQuotes: [],
    recentEmails: [],
    teamMembers: [],
};


export async function DashboardData({ children }: { children: React.ReactNode }) {
    // 1. Validació de sessió
    const session = await validatePageSession();
    if ('error' in session) {
        console.error("DashboardData: Sessió invàlida.");
        return <DashboardClient 
            initialData={defaultEmptyData} // ✅ Passem dades buides
            teamMembers={[]} 
            userId="" 
            activeTeamId=""
        >
            {children}
        </DashboardClient>;
    }
    const { supabase, user, activeTeamId } = session;

    // 2. UNA SOLA CRIDA al nostre "Cas d'Ús"
    const { data, error } = await getDashboardInitialData(
        supabase,
        user,
        activeTeamId
    );

    // 3. Gestió d'errors
    if (error || !data) {
        console.error("Error en carregar DashboardData (Component):", error);
        return <DashboardClient 
            initialData={defaultEmptyData} // ✅ Passem dades buides
            teamMembers={[]} 
            userId={user.id} 
            activeTeamId={activeTeamId}
        >
            {children}
        </DashboardClient>;
    }
    
    // 4. Passem les dades netes al client
    return (
        <DashboardClient
            initialData={data} // El servei ja retorna les dades processades
            teamMembers={data.teamMembers} // El servei ja inclou 'teamMembers'
            userId={user.id}
            activeTeamId={activeTeamId}
        >
            {children}
        </DashboardClient>
    );
}