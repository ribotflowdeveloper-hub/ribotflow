// src/app/[locale]/(app)/comunicacio/inbox/_components/InboxData.tsx
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { InboxClient } from "./InboxClient";
import { getTicketBodyAction } from "../actions";
import { getTeamMembersWithProfiles } from "@/lib/supabase/teams";
import { validateUserSession } from "@/lib/supabase/session";

// ✨ CANVI: Importem tots els tipus necessaris directament des de la nostra font de veritat.
import type { Contact, EnrichedTicket, TeamMemberWithProfile, Template } from '@/types/db';

export async function InboxData({ searchTerm }: { searchTerm: string }) {
    const session = await validateUserSession();
    const locale = (await (headers())).get('x-next-intl-locale') || 'ca';
    if ('error' in session) {
        redirect(`/${locale}/login`);
    }
    const { supabase, user, activeTeamId } = session;

    // ✨ CORRECCIÓ: Seleccionem totes les columnes ('*') per satisfer el tipus 'InboxPermission'.
    const { data: permissions, error: permissionsError } = await supabase
        .from('inbox_permissions')
        .select('*')
        .eq('team_id', activeTeamId)
        .eq('grantee_user_id', user.id);

    if (permissionsError) console.error("Error en carregar els permisos de l'inbox:", permissionsError);

    const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id).filter(Boolean) || [])];

    const [
        teamMembersRes,
        allTeamContactsRes,
        templatesRes,
        receivedCountRes,
        sentCountRes,
        ticketsRes
    ] = await Promise.all([
        // ✨ CORRECCIÓ: No cal transformar les dades. La funció ja retorna el tipus correcte.
        getTeamMembersWithProfiles(supabase, activeTeamId),
        supabase.from('contacts').select('*').eq('team_id', activeTeamId),
        supabase.from("email_templates").select("*").eq('team_id', activeTeamId),
        supabase.rpc('get_inbox_received_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_sent_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_tickets', {
            p_user_id: user.id,
            p_team_id: activeTeamId,
            p_visible_user_ids: visibleUserIds,
            p_limit: 50,
            p_offset: 0,
            p_search_term: searchTerm
        })
    ]);

    if (ticketsRes.error) console.error("Error RPC (get_inbox_tickets):", ticketsRes.error);

    // Assignem les dades als tipus correctes, amb valors per defecte segurs.
    const teamMembers: TeamMemberWithProfile[] = teamMembersRes.data || [];

    const allTeamContacts: Contact[] = allTeamContactsRes.data || [];
    const templates: Template[] = templatesRes.data || [];
    const receivedCount = receivedCountRes.data || 0;
    const sentCount = sentCountRes.data || 0;

    // ✨ CORRECCIÓ: Eliminem la transformació manual. El tipus retornat per la RPC és compatible.
    const tickets: EnrichedTicket[] = (ticketsRes.data as EnrichedTicket[] || []);

    let initialSelectedTicketBody: string | null = null;
    if (tickets.length > 0 && tickets[0].id) {
        const { body } = await getTicketBodyAction(tickets[0].id);
        initialSelectedTicketBody = body;
    }

    return (
        <InboxClient
            user={user}
            initialTickets={tickets}
            initialTemplates={templates}
            initialReceivedCount={receivedCount}
            initialSentCount={sentCount}
            initialSelectedTicket={tickets.length > 0 ? tickets[0] : null}
            initialSelectedTicketBody={initialSelectedTicketBody}
            teamMembers={teamMembers}
            permissions={permissions || []}
            allTeamContacts={allTeamContacts}
        />
    );
}