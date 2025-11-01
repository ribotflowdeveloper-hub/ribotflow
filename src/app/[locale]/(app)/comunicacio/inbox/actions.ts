// src/app/[locale]/(app)/comunicacio/inbox/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import type { Database } from "@/types/supabase";
// ✨ CANVI: Importem tots els tipus necessaris des de la nostra font de la veritat.
import type { DbTableInsert, EnrichedTicket, TicketFilter } from '@/types/db';
import { getActiveTeam } from "@/lib/supabase/teams";


interface ActionResult {
  success: boolean;
  message?: string;
}


// ✅ 1. Canviem la definició de 'type' a 'interface'.
//    Això fa que l'extensió del tipus base sigui més clara per a TypeScript.
export type TicketForSupplier = Database['public']['Tables']['tickets']['Row'] & {
  contacts: {
    id: number;
    nom: string | null;
    email: string | null;
  } | null;
};
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
/**
 * Carrega un tiquet específic pel seu ID.
 */
export async function getTicketByIdAction(ticketId: number): Promise<{ data: EnrichedTicket | null, error: string | null }> {
  try {
    const session = await validateUserSession();
    if ('error' in session) {
      throw new Error(session.error.message);
    }
    const { supabase, user, activeTeamId } = session;
    if (!user) throw new Error('User not authenticated');

    // 1. Calculem TOTS els IDs visibles (llista de permisos)
    const { data: permissions } = await supabase.from('inbox_permissions').select('target_user_id').eq('team_id', activeTeamId).eq('grantee_user_id', user.id);
    const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id) || [])];
    
    // 🔑 FIX CLAU: Fem una consulta directa a la taula/vista 'enriched_tickets'
    //             en lloc de cridar l'RPC amb paràmetres incorrectes.
    const { data: ticket, error } = await supabase
        .from('enriched_tickets')
        .select('*')
        .eq('id', ticketId) // Filtrem pel ticketId
        .in('user_id', visibleUserIds) // 🔒 Restricció de seguretat (visibilitat)
        .limit(1)
        .single(); // Utilitzem .single() perquè busquem per ID (hauria de ser únic)

    if (error) {
        console.error('Error in getTicketByIdAction (database):', error);
        throw error;
    }
    
    if (!ticket) {
        // Això es dispara si es troba l'ID però l'usuari no té permís (o no existeix)
        return { data: null, error: "No s'ha pogut trobar el correu especificat (ID vàlid però accés denegat o no existeix)." };
    }

    // Si tot va bé, retornem el tiquet
    return { data: ticket as EnrichedTicket, error: null };

  } catch (err: unknown) {
    console.error('Error in getTicketByIdAction (debug):', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { data: null, error: `Error intern en carregar el tiquet: ${errorMessage}` };
  }
}
/**
 * Obté els tickets dels contactes associats a un proveïdor.
 */
export async function fetchTicketsForSupplierContacts(supplierId: string): Promise<TicketForSupplier[]> {
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('team_id', activeTeamId);

  if (contactsError || !contacts || contacts.length === 0) {
    return [];
  }

  const contactIds = contacts.map(c => c.id);

  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*, contacts(id, nom, email)')
    .in('contact_id', contactIds)
    .eq('team_id', activeTeamId)
    .order('last_message_at', { ascending: false });

  if (ticketsError) {
    console.error("Error fetching tickets for supplier contacts:", ticketsError);
    return [];
  }

  // Fem un 'cast' per assegurar que les dades retornades compleixen amb la nostra interface.
  return (tickets as TicketForSupplier[]) || [];
}


// ✅ NOVA ACCIÓ: Afegeix aquesta funció al final del fitxer
/**
 * Elimina múltiples tiquets alhora.
 */
export async function deleteMultipleTicketsAction(ticketIds: number[]): Promise<ActionResult> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  if (!ticketIds || ticketIds.length === 0) {
    return { success: false, message: "No s'han proporcionat tiquets per eliminar." };
  }

  const { error } = await supabase
    .from("tickets")
    .delete()
    .in("id", ticketIds); // Utilitzem .in() per a un array d'IDs

  if (error) {
    console.error("Error en l'esborrat múltiple:", error);
    return { success: false, message: "No s'han pogut eliminar els tiquets." };
  }

  revalidatePath("/comunicacio/inbox"); // Refresquem la pàgina de l'inbox
  return { success: true, message: "Tiquets eliminats." };
}


/**
 * ✅ LÒGICA ACTUALITZADA
 * Prepara les dades per a un nou missatge iniciat des de la pàgina de Network.
 * Busca o crea un contacte per a l'equip destinatari i pre-omple el missatge.
 */
export async function prepareNetworkContactAction(recipientTeamId: string, projectId: string) {
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: "Accés denegat." };
    }
    const { supabase, activeTeamId } = session;

    const activeTeam = await getActiveTeam(supabase, activeTeamId);
    if (!activeTeam) {
        return { success: false, message: "No s'ha trobat l'equip actiu." };
    }

    try {
        // 1. Obtenir dades del projecte
        const { data: projectData, error: projectError } = await supabase
            .from('job_postings')
            .select('title')
            .eq('id', projectId)
            .single();

        if (projectError || !projectData) {
            console.error("Error prepareNetworkContact [Project]:", projectError);
            throw new Error("No s'ha pogut trobar el projecte.");
        }
        const { title: projectTitle } = projectData;

        // 2. Obtenir dades de l'equip destinatari (recipientTeam)
        const { data: recipientTeamData, error: teamError } = await supabase
            .from('teams')
            .select('name, email, owner_id')
            .eq('id', recipientTeamId)
            .single();

        if (teamError || !recipientTeamData) {
            console.error("Error prepareNetworkContact [Team]:", teamError);
            throw new Error("No s'ha pogut trobar l'equip destinatari.");
        }

        let recipientEmail = recipientTeamData.email;
        let recipientName = recipientTeamData.name || 'Contacte de Network';

        // 3. ✅ Lògica de Fallback: Si l'equip no té email, busquem el del propietari
        if (!recipientEmail) {
            const { data: ownerProfile, error: ownerError } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', recipientTeamData.owner_id)
                .single();
            
            if (ownerError || !ownerProfile || !ownerProfile.email) {
                console.error("Error prepareNetworkContact [Owner Profile]:", ownerError);
                // Aquest és l'error final si no trobem res
                throw new Error("L'equip destinatari no té un email de contacte configurat, ni ell ni el seu propietari.");
            }
            recipientEmail = ownerProfile.email;
            // Donem prioritat al nom de l'equip, però si no, fem servir el del propietari
            recipientName = recipientTeamData.name || ownerProfile.full_name || 'Contacte de Network';
        }

        // 4. Buscar si ja existeix un contacte per a aquest equip al nostre CRM
        let contactId: number;
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('team_id', activeTeam.id) // Que pertanyi al nostre equip
            .eq('email', recipientEmail)  // I tingui el mateix email
            .maybeSingle();

        if (existingContact) {
            contactId = existingContact.id;
        } else {
            // 5. Si no existeix, el creem
            const { data: newContact, error: createError } = await supabase
                .from('contacts')
                .insert({
                    team_id: activeTeam.id,
                    nom: recipientName,
                    email: recipientEmail,
                })
                .select('id')
                .single();

            if (createError || !newContact) {
                console.error("Error prepareNetworkContact [Contact Create]:", createError);
                throw new Error("No s'ha pogut crear el nou contacte.");
            }
            contactId = newContact.id;
            revalidatePath(`/${activeTeam.id}/crm/contacts`);
        }

        // 6. Preparar les dades inicials per al ComposeDialog
        const initialData = {
            contactId: String(contactId),
            subject: `Consulta sobre el projecte: ${projectTitle}`,
            body: `<p>Hola ${recipientName},</p><p><br></p><p>Estic interessat/da en el vostre projecte "<strong>${projectTitle}</strong>" que he vist a la xarxa de Ribotflow.</p><p><br></p><p>Salutacions,</p>`,
        };

        return { success: true, data: initialData };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut preparant el missatge.";
        console.error("Error a prepareNetworkContactAction:", message);
        return { success: false, message };
    }
}