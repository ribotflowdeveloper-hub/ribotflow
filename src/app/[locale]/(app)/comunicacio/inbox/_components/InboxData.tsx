
import { redirect } from 'next/navigation';
import { InboxClient } from "./InboxClient";
import { transformRpcToTicket, type Ticket, type Template, type TicketFromRpc } from "@/types/comunicacio/inbox";
import { getTicketBodyAction } from "../actions";
import { getTeamMembersWithProfiles } from "@/lib/supabase/teams";
import { validateUserSession } from "@/lib/supabase/session";
import { headers } from "next/headers";
import { type Contact } from '@/types/crm';

export async function InboxData({ searchTerm }: { searchTerm: string }) {
    const session = await validateUserSession();
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';
    if ('error' in session) {
        redirect(`/${locale}/login`);
    }
    const { supabase, user, activeTeamId } = session;

    const { data: permissions, error: permissionsError } = await supabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', activeTeamId)
        .eq('grantee_user_id', user.id);
        
    if (permissionsError) console.error("Error en carregar els permisos de l'inbox:", permissionsError);
    
    const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id).filter(Boolean) || [])];

    const [
        teamMembers,
        allTeamContactsRes, // El resultat de la promesa dels contactes
        templatesRes,
        receivedCountRes,
        sentCountRes,
        ticketsRes
    ] = await Promise.all([
        getTeamMembersWithProfiles(supabase, activeTeamId).then(members =>
            members.map(member => ({
                ...member,
                profiles: {
                    id: member.user_id,
                    full_name: member.full_name || null,
                    avatar_url: member.avatar_url || null,
                },
            }))
        ),
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

    // ✅ CORRECCIÓ: Declarem 'allTeamContacts' aquí, a partir del resultat de la promesa.
    const allTeamContacts: Contact[] = allTeamContactsRes.data || [];
    const tickets: Ticket[] = ((ticketsRes.data as TicketFromRpc[]) || []).map(transformRpcToTicket);
    const templates: Template[] = templatesRes.data || [];
    const receivedCount = receivedCountRes.data || 0;
    const sentCount = sentCountRes.data || 0;

    let initialSelectedTicketBody: string | null = null;
    if (tickets.length > 0) {
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
            allTeamContacts={allTeamContacts} // ✅ Ara la variable existeix i té el valor correcte.
        />
    );
}