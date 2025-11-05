// /src/app/[locale]/(app)/comunicacio/inbox/_components/InboxData.tsx (FITXER COMPLET I CORREGIT)

import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { InboxClient } from "./InboxClient";
import { validateUserSession } from "@/lib/supabase/session";
import { getInboxInitialData } from '@/lib/services/comunicacio/inbox.service';
import type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission } from '@/types/db'; 
import { getUsageLimitStatus } from "@/lib/subscription/subscription";

// Re-exportem tipus per a InboxClient
export type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission };

// Definim estats de límit per defecte

export async function InboxData() {
    const session = await validateUserSession();
    const locale = ((await headers()).get('x-next-intl-locale')) || 'ca'; 

    if ('error' in session) {
        console.error("InboxData: Sessió invàlida.", session.error.message);
        redirect(`/${locale}/login`);
    }
    const { supabase, user, activeTeamId } = session;

    // ✅ CORRECCIÓ: Carreguem AMBDÓS límits i les dades en UNA SOLA Promise.all
    const [ticketLimitCheck, contactLimitCheck, { data, error }] = await Promise.all([
        getUsageLimitStatus('maxTickets'),  // <-- Límit per a Tiquets
        getUsageLimitStatus('maxContacts'), // <-- Límit per a Contactes
        getInboxInitialData(supabase, user.id, activeTeamId)
    ]);

    // Gestionem l'error del servei
    if (error || !data) {
        console.error("Error en carregar les dades de l'Inbox (Component):", error);
        return (
            <InboxClient
                user={user} initialTickets={[]} initialTemplates={[]}
                initialReceivedCount={0} initialSentCount={0}
                teamMembers={[]} permissions={[]} allTeamContacts={[]}
                ticketLimitStatus={ticketLimitCheck} // Passa l'estat del límit de tiquets
                contactLimitStatus={contactLimitCheck} // Passa l'estat del límit de contactes
            />
        );
    }

    // Passem les dades i AMBDÓS límits al component client
    return (
        <InboxClient
            user={user} 
            initialTickets={data.tickets} 
            initialTemplates={data.templates}
            initialReceivedCount={data.receivedCount} 
            initialSentCount={data.sentCount}
            teamMembers={data.teamMembers} 
            permissions={data.permissions} 
            allTeamContacts={data.allTeamContacts}
            ticketLimitStatus={ticketLimitCheck}  // <-- Límit de Tiquets
            contactLimitStatus={contactLimitCheck} // <-- Límit de Contactes
        />
    );
}