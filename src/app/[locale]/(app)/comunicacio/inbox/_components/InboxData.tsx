// /app/[locale]/comunicacio/inbox/_components/InboxData.tsx

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { InboxClient } from "./InboxClient";
import type { Ticket, Template } from "@/types/comunicacio/inbox";
import { getTicketBodyAction } from "../actions";
import { headers } from "next/headers";

export async function InboxData({ searchTerm }: { searchTerm: string }) {
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return redirect(`/${locale}/settings/team`);

    // PAS 1: Busquem a quins altres usuaris té permís per a veure.
    const { data: permissions, error: permissionsError } = await supabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', activeTeamId)
        .eq('grantee_user_id', user.id);
    
    if (permissionsError) {
        console.error("Error en carregar els permisos de l'inbox:", permissionsError);
    }

    // PAS 2: Creem la llista final d'usuaris visibles (el seu propi ID + els permesos).
    const visibleUserIds = [user.id];
    if (permissions) {
        permissions.forEach(p => {
            if (p.target_user_id) {
                visibleUserIds.push(p.target_user_id);
            }
        });
    }

    // PAS 3: Fem la consulta final a 'tickets' amb el doble filtre.
    let ticketsQuery = supabase
        .from('tickets')
        .select(`id, user_id, contact_id, sender_name, sender_email, subject, preview, sent_at, status, type, contacts(*)`)
        .eq('team_id', activeTeamId)       // Filtre 1: Ha de ser de l'equip actiu.
        .in('user_id', visibleUserIds)    // Filtre 2: I ha de ser d'un usuari que tenim permís per a veure.
        .order('sent_at', { ascending: false })
        .limit(50);
        
    if (searchTerm) {
        ticketsQuery = ticketsQuery.or(`subject.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%,sender_email.ilike.%${searchTerm}%`);
    }
    
    // La resta de consultes també han de respectar els filtres.
    const templatesQuery = supabase.from("email_templates").select("*").eq('team_id', activeTeamId);
    const receivedCountQuery = supabase.from("tickets").select("id", { count: "exact", head: true }).eq('team_id', activeTeamId).in('user_id', visibleUserIds).or("type.eq.rebut,type.is.null");
    const sentCountQuery = supabase.from("tickets").select("id", { count: "exact", head: true }).eq('team_id', activeTeamId).in('user_id', visibleUserIds).eq("type", "enviat");
    
    const [ticketsRes, templatesRes, receivedCountRes, sentCountRes] = await Promise.all([
        ticketsQuery,
        templatesQuery,
        receivedCountQuery,
        sentCountQuery,
    ]);

    const tickets = (ticketsRes.data as unknown as Ticket[]) || [];
    const templates = (templatesRes.data as Template[]) || [];
    const receivedCount = receivedCountRes.count || 0;
    const sentCount = sentCountRes.count || 0;

    let initialSelectedTicketBody: string | null = null;
    if (tickets.length > 0) {
        const { body } = await getTicketBodyAction(tickets[0].id);
        initialSelectedTicketBody = body;
    }

    return (
        <InboxClient
            initialTickets={tickets}
            initialTemplates={templates}
            initialReceivedCount={receivedCount}
            initialSentCount={sentCount}
            initialSelectedTicket={tickets.length > 0 ? tickets[0] : null}
            initialSelectedTicketBody={initialSelectedTicketBody}
        />
    );
}