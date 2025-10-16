// src/app/[locale]/(app)/comunicacio/inbox/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";

// ✨ CANVI: Importem tots els tipus necessaris des de la nostra font de la veritat.
import type { DbTableInsert, EnrichedTicket, TicketFilter } from '@/types/db';

interface ActionResult {
  success: boolean;
  message?: string;
}

/**
 * Retorna el cos d'un tiquet.
 */
export async function getTicketBodyAction(ticketId: number): Promise<{ body: string }> {
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
  contactId: number; // ✨ CANVI: L'ID del contacte és un número.
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
  const { supabase, user, activeTeamId } = session; // Necessitem l'usuari aquí.

  try {
    const { data: contact } = await supabase.from('contacts').select('id').eq('id', contactId).maybeSingle();
    if (!contact) return { success: false, message: "El contacte no pertany al teu equip actiu." };

    await supabase.functions.invoke("send-email", { body: { contactId, subject, htmlBody } });

    if (isReply) {
      const { data: existingOpportunities } = await supabase
        .from("opportunities")
        .select("id")
        .eq("contact_id", contactId)
        .limit(1);
      
      // ✨ CANVI: Utilitzem el tipus `DbTableInsert` per a una inserció segura.
      if (!existingOpportunities || existingOpportunities.length === 0) {
        const newOpportunity: DbTableInsert<'opportunities'> = {
          team_id: activeTeamId,
          user_id: user.id, // Afegim el user_id que és obligatori.
          contact_id: contactId,
          name: `Oportunitat: ${subject}`,
          stage_name: "Contactat",
          source: "Resposta Email",
          value: 0,
        };
        await supabase.from("opportunities").insert(newOpportunity);
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
 * Assigna un tiquet a un tracte (opportunity).
 */
export async function assignTicketAction(ticketId: number, dealId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  // ✨ CANVI: Tipus segur per a la inserció.
  const newAssignment: DbTableInsert<'ticket_assignments'> = {
    ticket_id: ticketId,
    team_id: activeTeamId,
    deal_id: dealId
  };
  
  const { error } = await supabase.from('ticket_assignments').insert(newAssignment);

  if (error) {
    console.error("Error en assignar el tiquet:", error);
    return { success: false, message: "No s'ha pogut assignar el tiquet." };
  }

  revalidatePath("/comunicacio/inbox");
  return { success: true, message: "Tiquet assignat." };
}

/**
 * Carrega més tiquets de forma paginada.
 */
export async function loadMoreTicketsAction(page: number, filter: TicketFilter, inboxOwnerId: string): Promise<EnrichedTicket[]> {
    const session = await validateUserSession();
    if ('error' in session) return [];
    const { supabase, user, activeTeamId } = session;

    const { data: permissions } = await supabase.from('inbox_permissions').select('target_user_id').eq('team_id', activeTeamId).eq('grantee_user_id', user.id);
    const allVisibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id) || [])];
    const visibleUserIds = inboxOwnerId === 'all' ? allVisibleUserIds : [inboxOwnerId];
    const ITEMS_PER_PAGE = 50;
    const offset = (page - 1) * ITEMS_PER_PAGE;
    
    let query = supabase
        .from("enriched_tickets")
        .select('*')
        .in('user_id', visibleUserIds)
        .order("sent_at", { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);
    
    if (filter === "rebuts") {
        query = query.or("type.eq.rebut,type.is.null");
    } else if (filter === "enviats") {
        query = query.eq("type", "enviat");
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error loading more tickets:", error);
        return [];
    }
    
    // El 'data' ja ve tipat correctament com a EnrichedTicket[] gràcies a la generació de tipus.
    return data || [];
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
    // ✨ CANVI: Tipus segur per a la inserció.
    const newRule: DbTableInsert<'blacklist_rules'> = {
      team_id: activeTeamId,
      user_id: user.id,
      value: cleanedEmail,
      rule_type: 'email',
    };
    await supabase.from('blacklist_rules').insert(newRule).throwOnError();

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
 * Vincula tots els tiquets d'un remitent a un contacte existent.
 */
export async function linkTicketsToContactAction(contactId: number, senderEmail: string): Promise<ActionResult> {
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

/**
 * Carrega tiquets de forma paginada o per cerca.
 */
// src/app/[locale]/(app)/comunicacio/inbox/actions.ts

// ... (altres accions)

export async function getTicketsAction(
  page: number, 
  filter: TicketFilter, 
  inboxOwnerId: string,
  searchTerm: string = ''
): Promise<EnrichedTicket[]> {
  const session = await validateUserSession();
  if ('error' in session) return [];
  const { supabase, user, activeTeamId } = session;

  const { data: permissions } = await supabase.from('inbox_permissions').select('target_user_id').eq('team_id', activeTeamId).eq('grantee_user_id', user.id);
  const allVisibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id) || [])];
  const visibleUserIds = inboxOwnerId === 'all' ? allVisibleUserIds : [inboxOwnerId];
  const ITEMS_PER_PAGE = 50;
  const offset = (page - 1) * ITEMS_PER_PAGE;
  
  // ✨ CORRECCIÓ: Passem el 'filter' a la funció RPC com a 'p_active_filter'
  const { data, error } = await supabase.rpc('get_inbox_tickets', {
    p_user_id: user.id,
    p_team_id: activeTeamId,
    p_visible_user_ids: visibleUserIds,
    p_limit: ITEMS_PER_PAGE,
    p_offset: offset,
    p_search_term: searchTerm,
    p_active_filter: filter // Passem el filtre actiu
  });
  
  if (error) {
    console.error("Error a getTicketsAction:", error);
    return [];
  }

  return (data ?? []) as EnrichedTicket[];
}


export async function getTicketByIdAction(ticketId: number): Promise<{ data: EnrichedTicket | null, error: string | null }> {
  try {
    const session = await validateUserSession();
    if ('error' in session) {
      throw new Error(session.error.message);
    }
    const { supabase, user, activeTeamId } = session;
    if (!user) throw new Error('User not authenticated');

    // Fem una crida a la funció RPC que ja tenim, però per a un sol tiquet
    const { data, error } = await supabase
      .rpc('get_inbox_tickets', {
        p_user_id: user.id,
        p_team_id: activeTeamId,
        p_visible_user_ids: [user.id], // Aquí podem ser més restrictius o oberts segons la lògica de permisos
        p_limit: 1,
        p_offset: 0,
        p_search_term: '',
        p_ticket_id: ticketId // ✅ El paràmetre clau per buscar un tiquet específic
      })
      .single();

    if (error) throw error;
    
    return { data: data as EnrichedTicket, error: null };

  } catch (err: unknown) {
    console.error('Error in getTicketByIdAction:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { data: null, error: errorMessage };
  }
}