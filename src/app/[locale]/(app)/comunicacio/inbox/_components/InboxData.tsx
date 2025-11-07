// /src/app/[locale]/(app)/comunicacio/inbox/_components/InboxData.tsx
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { InboxClient } from "./InboxClient";
import { validateUserSession } from "@/lib/supabase/session";
import { getInboxInitialData } from '@/lib/services/comunicacio/inbox.service';
// ✅ 1. Importem Pipeline
import type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission } from '@/types/db'; 
import { getUsageLimitStatus } from "@/lib/subscription/subscription";

// Re-exportem tipus per a InboxClient
export type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission };

export async function InboxData() {
    const session = await validateUserSession();
    const locale = ((await headers()).get('x-next-intl-locale')) || 'ca'; 

    if ('error' in session) {
        console.error("InboxData: Sessió invàlida.", session.error.message);
        redirect(`/${locale}/login`);
    }
    const { supabase, user, activeTeamId } = session;

    const [ticketLimitCheck, contactLimitCheck, { data, error }] = await Promise.all([
        getUsageLimitStatus('maxTickets'), 
        getUsageLimitStatus('maxContacts'),
        getInboxInitialData(supabase, user.id, activeTeamId)
    ]);

    // Gestionem l'error del servei
    if (error || !data) {
        console.error("Error en carregar les dades de l'Inbox (Component):", error);
        
        // ✅ 2. CORRECCIÓ: Afegim 'pipelines' (com un array buit) al fallback
        // i arreglem el nom 'ticketLimitStatus' que et donava error.
        return (
            <InboxClient
                user={user} 
                initialTickets={[]} 
                initialTemplates={[]}
                initialReceivedCount={0} 
                initialSentCount={0}
                teamMembers={[]} 
                permissions={[]} 
                allTeamContacts={[]}
                pipelines={[]} // ✅ AFEGIT
                ticketLimitStatus={ticketLimitCheck} 
                contactLimitStatus={contactLimitCheck}
            />
        );
    }

    // ✅ 3. CORRECCIÓ: Passem les 'pipelines' al client
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
            pipelines={data.pipelines} // ✅ AFEGIT
            ticketLimitStatus={ticketLimitCheck} 
            contactLimitStatus={contactLimitCheck} 
        />
    );
}