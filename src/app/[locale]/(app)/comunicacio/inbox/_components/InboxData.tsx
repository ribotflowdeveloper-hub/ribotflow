/**
 * @file src/app/[locale]/(app)/comunicacio/inbox/_components/InboxData.tsx
 */
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { InboxClient } from "./InboxClient";
import type { Ticket, Template } from "@/types/comunicacio/inbox";
// ✅ NOU: Importem la funció per obtenir el cos del tiquet
import { getTicketBodyAction } from "../actions";

export async function InboxData({ searchTerm }: { searchTerm: string }) {
    const supabase = createClient(cookies())
;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Primer, obtenim la llista de tiquets com abans
    let ticketsQuery = supabase
        .from('tickets')
        .select(`id, user_id, contact_id, sender_name, sender_email, subject, preview, sent_at, status, type, contacts(*)`)
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);
        
    if (searchTerm) {
        ticketsQuery = ticketsQuery.or(`subject.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%,sender_email.ilike.%${searchTerm}%`);
    }
    
    // Obtenim la resta de dades
    const templatesQuery = supabase.from("email_templates").select("*").eq("user_id", user.id);
    const receivedCountQuery = supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).or("type.eq.rebut,type.is.null");
    const sentCountQuery = supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "enviat");
    
    // Executem les consultes
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

    // ✅ NOU: Si tenim tiquets, obtenim el cos del primer tiquet AQUÍ, AL SERVIDOR.
    let initialSelectedTicketBody: string | null = null;
    if (tickets.length > 0) {
        const firstTicket = tickets[0];
        const { body } = await getTicketBodyAction(firstTicket.id);
        initialSelectedTicketBody = body;
    }

    return (
        <InboxClient
            initialTickets={tickets}
            initialTemplates={templates}
            initialReceivedCount={receivedCount}
            initialSentCount={sentCount}
            // ✅ NOU: Passem el primer tiquet i el seu cos com a propietats
            initialSelectedTicket={tickets.length > 0 ? tickets[0] : null}
            initialSelectedTicketBody={initialSelectedTicketBody}
        />
    );
}