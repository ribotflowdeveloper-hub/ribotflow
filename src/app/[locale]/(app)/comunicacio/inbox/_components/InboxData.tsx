// InboxData.tsx (server component)
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { InboxClient } from "./InboxClient";
import type { Ticket, Template } from "@/types/comunicacio/inbox";

interface InboxDataProps {
  searchParams?: { q?: string };
}

export async function InboxData({ searchParams }: InboxDataProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const searchTerm = searchParams?.q || "";

  // Carrega inicial per UI: PAGE 1 (50)
  // Això evita carregar 1000+ per defecte i millora el temps de render inicial.
  let ticketsQuery = supabase
    .from("tickets")
    .select(`id,user_id,contact_id,sender_name,sender_email,subject,preview,sent_at,status,type,contacts(*)`)
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(50);

  if (searchTerm) {
    ticketsQuery = ticketsQuery.or(
      `subject.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%,sender_email.ilike.%${searchTerm}%`
    );
  }

  // Comptadors totals (sense límit)
  const receivedCountQuery = supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or("type.eq.rebut,type.is.null");

  const sentCountQuery = supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "enviat");

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
