/**
 * @file src/app/[locale]/(app)/comunicacio/inbox/_components/InboxData.tsx
 */
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { InboxClient } from "./InboxClient";
import type { Ticket, Template } from "@/types/comunicacio/inbox";

/**
 * @summary Componente de Servidor 'async' que carga todos los datos necesarios para el Inbox.
 * @param searchTerm El término de búsqueda recibido como un string.
 */
export async function InboxData({ searchTerm }: { searchTerm: string }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // El middleware ya se encarga de la redirección

  let ticketsQuery = supabase
    .from('tickets')
    .select(`id, user_id, contact_id, sender_name, sender_email, subject, preview, sent_at, status, type, contacts(*)`)
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(50);
    
  // La lógica de búsqueda sigue siendo la misma, usando el 'searchTerm' recibido.
  if (searchTerm) {
    ticketsQuery = ticketsQuery.or(`subject.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%,sender_email.ilike.%${searchTerm}%`);
  }

  const receivedCountQuery = supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).or("type.eq.rebut,type.is.null");
  const sentCountQuery = supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "enviat");
  const templatesQuery = supabase.from("email_templates").select("*").eq("user_id", user.id);

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

  return (
    <InboxClient
      initialTickets={tickets}
      initialTemplates={templates}
      initialReceivedCount={receivedCount}
      initialSentCount={sentCount}
    />
  );
}