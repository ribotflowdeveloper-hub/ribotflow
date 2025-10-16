// src/app/[locale]/(app)/comunicacio/inbox/_components/InboxData.tsx (VERSIÓ FINAL)
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { InboxClient } from "./InboxClient";
import { getTeamMembersWithProfiles } from "@/lib/supabase/teams";
import { validateUserSession } from "@/lib/supabase/session";
import type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission } from '@/types/db';

// Aquest component ja no rep 'searchParams'.
export async function InboxData() {
    // El servidor SEMPRE carrega la vista per defecte (sense cerca).
    const searchTerm = '';

    const session = await validateUserSession();
    const locale = (await (headers())).get('x-next-intl-locale') || 'ca';
    if ('error' in session) {
        redirect(`/${locale}/login`);
    }
    const { supabase, user, activeTeamId } = session;

    const { data: permissions, error: permissionsError } = await supabase
        .from('inbox_permissions').select('*').eq('team_id', activeTeamId).eq('grantee_user_id', user.id);
    
    if (permissionsError) console.error("Error en carregar els permisos de l'inbox:", permissionsError);
    
    const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id).filter(Boolean) || [])];
    
    const [teamMembersRes, allTeamContactsRes, templatesRes, receivedCountRes, sentCountRes, ticketsRes] = await Promise.all([
        getTeamMembersWithProfiles(supabase, activeTeamId),
        supabase.from('contacts').select('*').eq('team_id', activeTeamId),
        supabase.from("email_templates").select("*").eq('team_id', activeTeamId),
        supabase.rpc('get_inbox_received_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_sent_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_tickets', {
            p_user_id: user.id, p_team_id: activeTeamId, p_visible_user_ids: visibleUserIds,
            p_limit: 50, p_offset: 0, p_search_term: searchTerm
        })
    ]);

    if (ticketsRes.error) console.error("Error RPC (get_inbox_tickets):", ticketsRes.error);

    const teamMembers: TeamMemberWithProfile[] = teamMembersRes.data || [];
    const allTeamContacts: Contact[] = allTeamContactsRes.data || [];
    const templates: Template[] = templatesRes.data || [];
    const receivedCount = receivedCountRes.data || 0;
    const sentCount = sentCountRes.data || 0;
    const tickets: EnrichedTicket[] = (ticketsRes.data as EnrichedTicket[] || []);
    const safePermissions: InboxPermission[] = permissions || [];
    
    return (
        <InboxClient
            user={user} initialTickets={tickets} initialTemplates={templates}
            initialReceivedCount={receivedCount} initialSentCount={sentCount}
            teamMembers={teamMembers} permissions={safePermissions} allTeamContacts={allTeamContacts}
        />
    );
}