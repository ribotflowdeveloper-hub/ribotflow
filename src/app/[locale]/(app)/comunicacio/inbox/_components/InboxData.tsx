// /app/comunicacio/inbox/_components/InboxData.tsx

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { InboxClient } from "./InboxClient";
import { transformRpcToTicket, type Ticket, type Template, type TicketFromRpc } from "@/types/comunicacio/inbox";
import { getTicketBodyAction } from "../actions";
import { headers } from "next/headers";

// Definim el tipus aquí per a més claredat
type TeamMemberForInbox = {
    profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

export async function InboxData({ searchTerm }: { searchTerm: string }) {
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return redirect(`/${locale}/settings/team`);

    // --- LÒGICA PER OBTENIR DADES ---

    // 1. Obtenim els membres de l'equip (amb el mètode manual que ja funciona)
    const { data: teamMembersIds, error: memberIdsError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', activeTeamId);

    if (memberIdsError) {
        console.error("Error en carregar els IDs dels membres:", memberIdsError);
    }
    const memberUserIds = teamMembersIds?.map(m => m.user_id) || [];
    
    // ✅ NOU: Obtenim la llista COMPLETA de contactes de l'equip actiu.
    const { data: allTeamContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*') // Seleccionem totes les dades per a mostrar-les al panell
        .eq('team_id', activeTeamId);

    if (contactsError) {
        console.error("Error en carregar els contactes de l'equip:", contactsError);
    }
    
    let teamMembers: TeamMemberForInbox[] = [];
    if (memberUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', memberUserIds);

        if (profilesError) {
            console.error("Error en carregar els perfils dels membres:", profilesError);
        }

        teamMembers = (profilesData || []).map(profile => ({
            profiles: profile
        }));
    }

    // 2. Obtenim els permisos per a construir la llista d'usuaris visibles
    const { data: permissions } = await supabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', activeTeamId)
        .eq('grantee_user_id', user.id);

    const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id).filter(Boolean) || [])];

    // 3. Cridem a les funcions RPC per obtenir tiquets i comptadors
    const ticketsRpcQuery = supabase.rpc('get_inbox_tickets', {
        p_user_id: user.id,
        p_team_id: activeTeamId,
        p_visible_user_ids: visibleUserIds,
        p_limit: 50,
        p_offset: 0,
        p_search_term: searchTerm
    });
    const receivedCountRpc = supabase.rpc('get_inbox_received_count', { p_visible_user_ids: visibleUserIds });
    const sentCountRpc = supabase.rpc('get_inbox_sent_count', { p_visible_user_ids: visibleUserIds });
    const templatesQuery = supabase.from("email_templates").select("*").eq('team_id', activeTeamId);

    // 4. Executem totes les consultes en paral·lel
    const [ticketsRes, templatesRes, receivedCountRes, sentCountRes] = await Promise.all([
        ticketsRpcQuery,
        templatesQuery,
        receivedCountRpc,
        sentCountRpc,
    ]);

    if (ticketsRes.error) console.error("Error RPC (get_inbox_tickets):", ticketsRes.error);

    // 5. Processem els resultats
    const tickets: Ticket[] = ((ticketsRes.data as TicketFromRpc[]) || []).map(transformRpcToTicket);
    const templates = (templatesRes.data as Template[]) || [];
    const receivedCount = receivedCountRes.data || 0;
    const sentCount = sentCountRes.data || 0;

    let initialSelectedTicketBody: string | null = null;
    if (tickets.length > 0) {
        const { body } = await getTicketBodyAction(tickets[0].id);
        initialSelectedTicketBody = body;
    }

    // 6. Passem totes les dades al component client
    return (
        <InboxClient
            user={user} // ✅ NOU: Passem l'objecte 'user' per al filtre de bústies
            initialTickets={tickets}
            initialTemplates={templates}
            initialReceivedCount={receivedCount}
            initialSentCount={sentCount}
            initialSelectedTicket={tickets.length > 0 ? tickets[0] : null}
            initialSelectedTicketBody={initialSelectedTicketBody}
            teamMembers={teamMembers}
            permissions={permissions || []}
            allTeamContacts={allTeamContacts || []} // ✅ Passem la llista de contactes com a prop

        />
    );
}