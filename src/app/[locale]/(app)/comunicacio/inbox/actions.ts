/**
 * actions.ts (Inbox) - Server Actions
 */
"use server";

import { revalidatePath } from "next/cache";
import { transformRpcToTicket, type Ticket, type TicketFromRpc } from "@/types/comunicacio/inbox";
import type { TicketFilter } from "@/types/comunicacio/inbox";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ Importem la nostra funció central


interface ActionResult {
  success: boolean;
  message?: string;
}


/**
 * Retorna el cos d'un tiquet.
 */
export async function getTicketBodyAction(ticketId: number): Promise<{ body: string }> {
  // Aquesta acció és només de lectura i la RLS ja la protegeix,
  // però per consistència, també validem la sessió.
  const session = await validateUserSession();
  if ('error' in session) return { body: `<p>Error: ${session.error.message}</p>` };
  const { supabase } = session;

  const { data, error } = await supabase
    .from("tickets")
    .select("body")
    .eq("id", ticketId)
    .single();

  if (error) {
    console.error("Error fetching ticket body:", error);
    return { body: "<p>Error carregant el cos del tiquet.</p>" };
  }
  return { body: data.body ?? "<p>(Sense contingut)</p>" };
}


/**
 * Elimina un tiquet.
 */
export async function deleteTicketAction(ticketId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase } = session;

  // La RLS ja s'encarrega de la seguretat, només permet esborrar els tiquets permesos.
  const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
  if (error) {
    return { success: false, message: "No s'ha pogut eliminar el tiquet." };
  }
  revalidatePath("/comunicacio/inbox");
  return { success: true, message: "Tiquet eliminat." };
}

/**
 * Marca un tiquet com a llegit.
 */
export async function markTicketAsReadAction(ticketId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase } = session;

  const { error } = await supabase.from("tickets").update({ status: "Llegit" }).eq("id", ticketId);
  if (error) {
    return { success: false, message: "No s'ha pogut marcar com a llegit." };
  }
  revalidatePath("/comunicacio/inbox", 'page');
  return { success: true };
}



/**
 * sendEmailAction
 */
interface SendEmailParams {
  contactId: string;
  subject: string;
  htmlBody: string;
  isReply: boolean;
}

export async function sendEmailAction({
  contactId,
  subject,
  htmlBody,
  isReply,
}: SendEmailParams): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  try {
    // La RLS de 'contacts' verificará que el contacto pertenezca al equipo activo
    const { data: contact } = await supabase.from('contacts').select('id').eq('id', contactId).maybeSingle();
    if (!contact) return { success: false, message: "El contacto no pertenece a tu equipo activo." };

    await supabase.functions.invoke("send-email", { body: { contactId, subject, htmlBody } });


    if (isReply) {
      const { data: existingOpportunities } = await supabase
        .from("opportunities")
        .select("id")
        .eq("contact_id", contactId)
        .limit(1);

      if (!existingOpportunities || existingOpportunities.length === 0) {
        await supabase.from("opportunities").insert({
          team_id: activeTeamId,
          contact_id: contactId,
          name: `Oportunitat: ${subject}`,
          stage_name: "Contactat",
          source: "Resposta Email",
          value: 0,
        });
      }
    }

    revalidatePath("/comunicacio/inbox");
    return { success: true, message: "Correu enviat correctament." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    console.error("Error en enviar l'email:", message);
    return { success: false, message: `Error en la Server Action: ${message}` };
  }
}


/**
 * loadAllTicketsAction - retorna TOTS els tiquets (sense límit) segons el filtre.
 * Útil quan l'usuari fa click a "Tots" i vol veure absolutament tot.
 */
export async function loadAllTicketsAction(filter: TicketFilter): Promise<Ticket[]> {
  const session = await validateUserSession();
  if ('error' in session) return [];
  const { supabase, user } = session;

  let query = supabase
    .from("tickets")
    .select(`id, user_id, contact_id, sender_name, sender_email, subject, preview, sent_at, status, type, contacts(*)`)
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false });

  if (filter === "rebuts" || filter === "noLlegits") {
    query = query.or("type.eq.rebut,type.is.null");
  } else if (filter === "enviats") {
    query = query.eq("type", "enviat");
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error loading all tickets:", error);
    return [];
  }

  return (data as unknown) as Ticket[];
}

/**
 * Assigna un tiquet a un tracte (opportunity).
 */
export async function assignTicketAction(ticketId: number, dealId: string): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const { error } = await supabase.from('ticket_assignments').insert({
    ticket_id: ticketId,
    team_id: activeTeamId,
    deal_id: dealId
  });

  if (error) {
    console.error("Error en assignar el tiquet:", error);
    return { success: false, message: "No s'ha pogut assignar el tiquet." };
  }

  revalidatePath("/comunicacio/inbox");
  return { success: true, message: "Tiquet assignat." };
}

/**
 * Carga més tiquets de forma paginada.
 */
export async function loadMoreTicketsAction(page: number, filter: TicketFilter, inboxOwnerId: string): Promise<Ticket[]> {
  // Aquesta funció ja estava ben refactoritzada i utilitzava 'getInboxPermissionContext'.
  // La podem mantenir així o adaptar-la a 'validateUserSession' si vols unificar-ho tot.
  // De moment, la deixem com estava, ja que funciona i està ben estructurada.

  const session = await validateUserSession();
  if ('error' in session) return [];
  const { supabase, user, activeTeamId } = session;

  const { data: permissions } = await supabase
    .from('inbox_permissions')
    .select('target_user_id')
    .eq('team_id', activeTeamId)
    .eq('grantee_user_id', user.id);

  const allVisibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id).filter(Boolean) || [])];

  const visibleUserIds = inboxOwnerId === 'all' ? allVisibleUserIds : [inboxOwnerId];

  const ITEMS_PER_PAGE = 50;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const { data: ticketsData, error } = await supabase.rpc('get_inbox_tickets', {
    p_user_id: user.id,
    p_team_id: activeTeamId,
    p_visible_user_ids: visibleUserIds,
    p_limit: ITEMS_PER_PAGE,
    p_offset: offset,
    p_search_term: ''
  });

  if (error) {
    console.error("Error loading more tickets via RPC:", error);
    return [];
  }

  const tickets: Ticket[] = (ticketsData as TicketFromRpc[] || []).map(transformRpcToTicket);

  // Filtratge final al client
  if (filter === 'rebuts' || filter === 'noLlegits') {
    return tickets.filter(t => t.type === 'rebut' || !t.type);
  }
  if (filter === 'enviats') {
    return tickets.filter(t => t.type === 'enviat');
  }

  return tickets;
}

/**
 * Afegeix un email a la llista negra.
 */
export async function addToBlacklistAction(emailToBlock: string): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const cleanedEmail = emailToBlock.trim().toLowerCase();
  if (!cleanedEmail) return { success: false, message: "L'email no pot estar buit." };

  try {
    await supabase.from('blacklist_rules').insert({
      team_id: activeTeamId,
      user_id: user.id,
      value: cleanedEmail,
      rule_type: 'email',
    }).throwOnError();

    revalidatePath("/comunicacio/inbox");
    return { success: true, message: `${cleanedEmail} ha estat afegit a la llista negra.` };

  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key value')) {
      return { success: false, message: "Aquest correu ja és a la llista negra." };
    }
    console.error("Error afegint a la blacklist:", error);
    const message = error instanceof Error ? error.message : "Error desconegut.";
    return { success: false, message };
  }
}

/**
 * Nova acció que vincula tots els tiquets d'un remitent a un contacte existent.
 */
export async function linkTicketsToContactAction(contactId: string, senderEmail: string): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user } = session;

  try {
      await supabase
          .from("tickets")
          .update({ contact_id: contactId })
          .eq("user_id", user.id)
          .eq("sender_email", senderEmail.toLowerCase());

      revalidatePath("/comunicacio/inbox");
      return { success: true, message: "Contacte vinculat correctament." };
  } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconegut al vincular tiquets.";
      return { success: false, message };
  }
}