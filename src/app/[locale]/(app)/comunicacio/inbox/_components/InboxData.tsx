// src/app/[locale]/(app)/comunicacio/inbox/_components/InboxData.tsx

import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { InboxClient } from "./InboxClient";
import { validateUserSession } from "@/lib/supabase/session";
// ✅ 1. Importem el servei i els tipus necessaris des del servei
import { getInboxInitialData } from '@/lib/services/comunicacio/inbox.service';
import type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission } from '@/types/db'; // Mantenim tipus per claredat al component client
import { getUsageLimitStatus } from "@/lib/subscription/subscription";
// Re-exportem tipus per a InboxClient
export type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission };

export async function InboxData() {
    // Obtenim sessió i locale
    const session = await validateUserSession();
    const locale = ((await headers()).get('x-next-intl-locale')) || 'ca'; // Simplificat

    if ('error' in session) {
        console.error("InboxData: Sessió invàlida.", session.error.message);
        redirect(`/${locale}/login`);
    }
    const { supabase, user, activeTeamId } = session;

    // ✅ 2. Executem la comprovació de límit i la càrrega de dades EN PARAL·LEL
    const [limitCheck, { data, error }] = await Promise.all([
        getUsageLimitStatus('maxContacts'), // <-- Més net i reutilitzable
        getInboxInitialData(supabase, user.id, activeTeamId)
    ]);
    // ✅ 2. Cridem al servei per obtenir totes les dades inicials

    // ✅ 3. Gestionem l'error del servei
    if (error || !data) {
        console.error("Error en carregar les dades de l'Inbox (Component):", error);
        // Podries mostrar un missatge d'error més específic o un estat buit robust
        return (
            <InboxClient
                user={user} initialTickets={[]} initialTemplates={[]}
                initialReceivedCount={0} initialSentCount={0}
                teamMembers={[]} permissions={[]} allTeamContacts={[]}
                limitStatus={limitCheck} // Passa l'estat del límit fins i tot si falla la llista

            // Passa un estat d'error opcional al client si vols
            // errorLoading={error ? 'Error en carregar les dades inicials.' : undefined}
            />
        );
    }

    // ✅ 4. Passem les dades obtingudes del servei al component client
    return (
        <InboxClient
            user={user} initialTickets={data.tickets} initialTemplates={data.templates}
            initialReceivedCount={data.receivedCount} initialSentCount={data.sentCount}
            teamMembers={data.teamMembers} permissions={data.permissions} allTeamContacts={data.allTeamContacts}
            limitStatus={limitCheck} // Passa l'estat del límit fins i tot si falla la llista

        />
    );
}