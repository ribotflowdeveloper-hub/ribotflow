// src/lib/services/comunicacio/inbox.service.ts

import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { 
    Contact, 
    EnrichedTicket, 
    TeamMemberWithProfile, 
    Template, 
    InboxPermission,
    DbTableInsert,
    TicketFilter,
    TicketForSupplier, // ✅ Importem el tipus que vam definir a db.ts
    Team 
} from '@/types/db';
import { getTeamMembersWithProfiles } from "@/lib/supabase/teams";

// --- Tipus de Retorn del Servei (Ja el tenies) ---
export type InboxInitialData = {
    permissions: InboxPermission[];
    teamMembers: TeamMemberWithProfile[];
    allTeamContacts: Contact[];
    templates: Template[];
    receivedCount: number;
    sentCount: number;
    tickets: EnrichedTicket[];
};

export type InboxDataError = {
    permissionsError?: PostgrestError | null;
    teamMembersError?: PostgrestError | { message: string } | null;
    contactsError?: PostgrestError | null;
    templatesError?: PostgrestError | null;
    receivedCountError?: PostgrestError | null;
    sentCountError?: PostgrestError | null;
    ticketsError?: PostgrestError | null;
};

/**
 * SERVEI (Ja el tenies)
 * Obté totes les dades inicials necessàries per a la pàgina de l'Inbox.
 */
export async function getInboxInitialData(
    supabase: SupabaseClient<Database>,
    userId: string,
    teamId: string
): Promise<{ data: InboxInitialData | null; error: InboxDataError | null }> {
    // ... (Aquesta funció ja era correcta i no es modifica) ...
    // 1. Obtenir permisos
    const { data: permissions, error: permissionsError } = await supabase
        .from('inbox_permissions')
        .select('*')
        .eq('team_id', teamId)
        .eq('grantee_user_id', userId);

    if (permissionsError) {
        console.error("Error en carregar els permisos de l'inbox (service):", permissionsError);
        return { data: null, error: { permissionsError } };
    }

    const safePermissions: InboxPermission[] = permissions || [];
    const visibleUserIds = [userId, ...(safePermissions.map(p => p.target_user_id).filter(Boolean) || [])];

    // 2. Executar la resta de consultes en paral·lel
    const [
        teamMembersRes,
        allTeamContactsRes,
        templatesRes,
        receivedCountRes,
        sentCountRes,
        ticketsRes
    ] = await Promise.all([
        getTeamMembersWithProfiles(supabase, teamId),
        supabase.from('contacts').select('*').eq('team_id', teamId),
        supabase.from("email_templates").select("*").eq('team_id', teamId),
        supabase.rpc('get_inbox_received_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_sent_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_tickets', {
            p_user_id: userId,
            p_team_id: teamId,
            p_visible_user_ids: visibleUserIds,
            p_limit: 50,
            p_offset: 0,
            p_search_term: '',
            p_active_filter: ''
        })
    ]);

    // 3. Comprovar errors
    const errors: InboxDataError = {};
    if (teamMembersRes.error) errors.teamMembersError = teamMembersRes.error;
    if (allTeamContactsRes.error) errors.contactsError = allTeamContactsRes.error;
    if (templatesRes.error) errors.templatesError = templatesRes.error;
    if (receivedCountRes.error) errors.receivedCountError = receivedCountRes.error;
    if (sentCountRes.error) errors.sentCountError = sentCountRes.error;
    if (ticketsRes.error) errors.ticketsError = ticketsRes.error;

    if (Object.keys(errors).length > 0) {
        console.error("Error(s) a getInboxInitialData (service):", errors);
        if (permissionsError) errors.permissionsError = permissionsError;
        return { data: null, error: errors };
    }

    // 4. Construir i retornar les dades
    const data: InboxInitialData = {
        permissions: safePermissions,
        teamMembers: (teamMembersRes.data as TeamMemberWithProfile[]) || [],
        allTeamContacts: (allTeamContactsRes.data as Contact[]) || [],
        templates: (templatesRes.data as Template[]) || [],
        receivedCount: receivedCountRes.data || 0,
        sentCount: sentCountRes.data || 0,
        tickets: (ticketsRes.data as EnrichedTicket[] || [])
    };

    return { data, error: null };
}

// ---
// ⚙️ FUNCIONS DE SERVEI (Mogudes des de 'actions.ts')
// ---

/**
 * SERVEI: Retorna el cos d'un tiquet.
 */
export async function getTicketBody(
    supabase: SupabaseClient<Database>,
    ticketId: number
    // ❌ ELIMINAT: teamId: string -> Aquesta columna no existeix a 'tickets'
): Promise<string> {
    const { data, error } = await supabase
        .from("tickets")
        .select("body")
        .eq("id", ticketId)
        // ❌ ELIMINAT: .eq("team_id", teamId)
        .single();

    if (error) {
        console.error("Error fetching ticket body (service):", error);
        return "<p>Error carregant el cos del tiquet.</p>";
    }
    return data.body ?? "<p>(Sense contingut)</p>";
}

/**
 * SERVEI: Elimina un tiquet.
 * Llança un error si falla.
 */
export async function deleteTicket(
    supabase: SupabaseClient<Database>,
    ticketId: number
    // ❌ ELIMINAT: teamId: string
): Promise<void> {
    const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketId);
        // ❌ ELIMINAT: .eq("team_id", teamId)

    if (error) {
        console.error("Error a deleteTicket (service):", error);
        throw new Error("No s'ha pogut eliminar el tiquet.");
    }
}

/**
 * SERVEI: Marca un tiquet com a llegit.
 * Llança un error si falla.
 */
export async function markTicketAsRead(
    supabase: SupabaseClient<Database>,
    ticketId: number
    // ❌ ELIMINAT: teamId: string
): Promise<void> {
    const { error } = await supabase
        .from("tickets")
        .update({ status: "Llegit" })
        .eq("id", ticketId);
        // ❌ ELIMINAT: .eq("team_id", teamId)

    if (error) {
        console.error("Error a markTicketAsRead (service):", error);
        throw new Error("No s'ha pogut marcar com a llegit.");
    }
}

/**
 * Paràmetres per al servei d'enviament d'email.
 */
interface SendEmailServiceParams {
    supabase: SupabaseClient<Database>;
    contactId: number;
    subject: string;
    htmlBody: string;
    isReply: boolean;
    userId: string;
    teamId: string;
}

/**
 * SERVEI: Envia un email i realitza lògiques associades
 * (Aquesta funció era correcta, no es modifica)
 */
export async function sendEmail({
    supabase,
    contactId,
    subject,
    htmlBody,
    isReply,
    userId,
    teamId,
}: SendEmailServiceParams): Promise<void> {
    // 1. Validar que el contacte pertany a l'equip (Correcte)
    const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', contactId)
        .eq('team_id', teamId) 
        .maybeSingle();

    if (!contact) {
        throw new Error("El contacte no pertany al teu equip actiu.");
    }

    // 2. Invocar la Edge Function (Correcte)
    const { error: invokeError } = await supabase.functions.invoke("send-email", {
        body: { contactId, subject, htmlBody },
    });

    if (invokeError) {
        console.error("Error en invocar 'send-email' (service):", invokeError);
        throw new Error(`Error en el servei d'enviament: ${invokeError.message}`);
    }

    // 3. Lògica de negoci addicional (Correcte)
    if (isReply) {
        const { data: existingOpportunities } = await supabase
            .from("opportunities")
            .select("id")
            .eq("contact_id", contactId)
            .eq("team_id", teamId) // Correcte
            .limit(1);

        if (!existingOpportunities || existingOpportunities.length === 0) {
            const newOpportunity: DbTableInsert<'opportunities'> = {
                team_id: teamId,
                user_id: userId,
                contact_id: contactId,
                name: `Oportunitat: ${subject}`,
                stage_name: "Contactat",
                source: "Resposta Email",
                value: 0,
            };
            await supabase.from("opportunities").insert(newOpportunity).throwOnError();
        }
    }
}

/**
 * SERVEI: Assigna un tiquet a un tracte (opportunity).
 * (Aquesta funció era correcta, no es modifica)
 */
export async function assignTicket(
    supabase: SupabaseClient<Database>,
    ticketId: number,
    dealId: number,
    teamId: string
): Promise<void> {
    const newAssignment: DbTableInsert<'ticket_assignments'> = {
        ticket_id: ticketId,
        team_id: teamId,
        deal_id: dealId
    };

    const { error } = await supabase.from('ticket_assignments').insert(newAssignment);

    if (error) {
        console.error("Error en assignar el tiquet (service):", error);
        throw new Error("No s'ha pogut assignar el tiquet.");
    }
}

/**
 * SERVEI: Carrega més tiquets de forma paginada.
 * (Aquesta funció era correcta, no es modifica)
 */
export async function loadMoreTickets(
    supabase: SupabaseClient<Database>,
    page: number,
    filter: TicketFilter,
    inboxOwnerId: string,
    userId: string,
    teamId: string
): Promise<EnrichedTicket[]> {
    const { data: permissions } = await supabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', teamId)
        .eq('grantee_user_id', userId);

    const allVisibleUserIds = [userId, ...(permissions?.map(p => p.target_user_id) || [])];
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
        console.error("Error loading more tickets (service):", error);
        return [];
    }

    return data || [];
}

/**
 * SERVEI: Afegeix un email a la llista negra.
 * (Aquesta funció era correcta, no es modifica)
 */
export async function addToBlacklist(
    supabase: SupabaseClient<Database>,
    emailToBlock: string,
    userId: string,
    teamId: string
): Promise<void> {
    const cleanedEmail = emailToBlock.trim().toLowerCase();
    if (!cleanedEmail) {
        throw new Error("L'email no pot estar buit.");
    }

    const newRule: DbTableInsert<'blacklist_rules'> = {
        team_id: teamId,
        user_id: userId,
        value: cleanedEmail,
        rule_type: 'email',
    };
    await supabase.from('blacklist_rules').insert(newRule).throwOnError();
}

/**
 * SERVEI: Vincula tots els tiquets d'un remitent a un contacte existent.
 */
export async function linkTicketsToContact(
    supabase: SupabaseClient<Database>,
    contactId: number,
    senderEmail: string,
    userId: string
    // ❌ ELIMINAT: teamId: string
): Promise<void> {
    const { error } = await supabase
        .from("tickets")
        .update({ contact_id: contactId })
        .eq("user_id", userId) // ✅ Aquesta era la lògica original i correcta
        .eq("sender_email", senderEmail.toLowerCase());
        // ❌ ELIMINAT: .eq("team_id", teamId)

    if (error) {
        console.error("Error a linkTicketsToContact (service):", error);
        throw new Error("Error desconegut al vincular tiquets.");
    }
}

/**
 * SERVEI: Carrega tiquets de forma paginada o per cerca usant RPC.
 * (Aquesta funció era correcta, no es modifica)
 */
export async function getTickets(
    supabase: SupabaseClient<Database>,
    page: number,
    filter: TicketFilter,
    inboxOwnerId: string,
    searchTerm: string,
    userId: string,
    teamId: string
): Promise<EnrichedTicket[]> {
    const { data: permissions } = await supabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', teamId)
        .eq('grantee_user_id', userId);

    const allVisibleUserIds = [userId, ...(permissions?.map(p => p.target_user_id) || [])];
    const visibleUserIds = inboxOwnerId === 'all' ? allVisibleUserIds : [inboxOwnerId];
    const ITEMS_PER_PAGE = 50;
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const { data, error } = await supabase.rpc('get_inbox_tickets', {
        p_user_id: userId,
        p_team_id: teamId,
        p_visible_user_ids: visibleUserIds,
        p_limit: ITEMS_PER_PAGE,
        p_offset: offset,
        p_search_term: searchTerm,
        p_active_filter: filter
    });

    if (error) {
        console.error("Error a getTickets (service):", error);
        return [];
    }
    return (data ?? []) as EnrichedTicket[];
}

/**
 * SERVEI: Carrega un tiquet específic pel seu ID.
 * (Aquesta funció era correcta, no es modifica)
 */
export async function getTicketById(
    supabase: SupabaseClient<Database>,
    ticketId: number,
    userId: string,
    teamId: string
): Promise<EnrichedTicket | null> {
    const { data: permissions } = await supabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', teamId)
        .eq('grantee_user_id', userId);

    const visibleUserIds = [userId, ...(permissions?.map(p => p.target_user_id) || [])];

    const { data: ticket, error } = await supabase
        .from('enriched_tickets')
        .select('*')
        .eq('id', ticketId)
        .in('user_id', visibleUserIds) 
        .limit(1)
        .single();

    if (error) {
        console.error('Error in getTicketById (service):', error);
        throw error;
    }
    return ticket as EnrichedTicket | null;
}

/**
 * SERVEI: Obté els tickets dels contactes associats a un proveïdor.
 */
export async function fetchTicketsForSupplierContacts(
  supabase: SupabaseClient<Database>,
  supplierId: string,
  teamId: string
): Promise<TicketForSupplier[]> {
  // 1. Obté els IDs dels contactes (aquesta part estava bé)
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('team_id', teamId)

  if (contactsError) {
    console.error(
      'Error fetching contacts for supplier (service):',
      contactsError
    )
    return []
  }

  if (!contacts || contacts.length === 0) {
    return [] // No hi ha contactes, retornem array buit
  }

  const contactIds = contacts.map((c) => c.id)

  // 2. Obté els tickets per a aquests contactes
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select(
      `
      *, 
      contacts!inner (  /* ✅ 1. Canviem a !inner per assegurar el join */
        id, 
        full_name,
        email
      )
      `
    )
    .in('contact_id', contactIds)
    .eq('team_id', teamId)
    // ✅✅✅ LÍNIA CLAU DE LA SOLUCIÓ ✅✅✅
    .eq('contacts.team_id', teamId) /* 2. Afegim filtre RLS a la taula annidada */
    // ✅✅✅ FI DE LA SOLUCIÓ ✅✅✅
    .order('last_reply_at', { ascending: false })

  if (ticketsError) {
    // Ara aquest error ja no hauria de ser {}, sinó un error real si n'hi hagués
    console.error(
      'Error fetching tickets for supplier contacts (service):',
      ticketsError
    )
    return []
  }

  // Assegurem el tipus de retorn
  return (tickets as unknown as TicketForSupplier[]) || []
}

/**
 * SERVEI: Elimina múltiples tiquets alhora.
 * Llança un error si falla.
 */
export async function deleteMultipleTickets(
    supabase: SupabaseClient<Database>,
    ticketIds: number[]
    // ❌ ELIMINAT: teamId: string
): Promise<void> {
    if (!ticketIds || ticketIds.length === 0) {
        throw new Error("No s'han proporcionat tiquets per eliminar.");
    }

    const { error } = await supabase
        .from("tickets")
        .delete()
        .in("id", ticketIds);
        // ❌ ELIMINAT: .eq("team_id", teamId)

    if (error) {
        console.error("Error en l'esborrat múltiple (service):", error);
        throw new Error("No s'han pogut eliminar els tiquets.");
    }
}

/**
 * Tipus de retorn per prepareNetworkContact
 */
export interface NetworkContactData {
    contactId: string;
    subject: string;
    body: string;
}

/**
 * SERVEI: Prepara les dades per a un nou missatge de Network.
 * (Aquesta funció era correcta, no es modifica)
 */
export async function prepareNetworkContact(
    supabase: SupabaseClient<Database>,
    recipientTeamId: string,
    projectId: string,
    activeTeam: Team
): Promise<{ data: NetworkContactData, contactCreated: boolean }> {

    // 1. Obtenir dades del projecte
    const { data: projectData, error: projectError } = await supabase
        .from('job_postings')
        .select('title')
        .eq('id', projectId)
        .single();

    if (projectError || !projectData) {
        console.error("Error prepareNetworkContact [Project] (service):", projectError);
        throw new Error("No s'ha pogut trobar el projecte.");
    }
    const { title: projectTitle } = projectData;

    // 2. Obtenir dades de l'equip destinatari
    const { data: recipientTeamData, error: teamError } = await supabase
        .from('teams')
        .select('name, email, owner_id')
        .eq('id', recipientTeamId)
        .single();

    if (teamError || !recipientTeamData) {
        console.error("Error prepareNetworkContact [Team] (service):", teamError);
        throw new Error("No s'ha pogut trobar l'equip destinatari.");
    }

    let recipientEmail = recipientTeamData.email;
    let recipientName = recipientTeamData.name || 'Contacte de Network';

    // 3. Fallback
    if (!recipientEmail) {
        const { data: ownerProfile, error: ownerError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', recipientTeamData.owner_id)
            .single();

        if (ownerError || !ownerProfile || !ownerProfile.email) {
            console.error("Error prepareNetworkContact [Owner Profile] (service):", ownerError);
            throw new Error("L'equip destinatari no té un email de contacte configurat.");
        }
        recipientEmail = ownerProfile.email;
        recipientName = recipientTeamData.name || ownerProfile.full_name || 'Contacte de Network';
    }

    // 4. Buscar si ja existeix un contacte
    let contactId: number;
    let contactCreated = false;
    const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('team_id', activeTeam.id) // Correcte
        .eq('email', recipientEmail)
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
            console.error("Error prepareNetworkContact [Contact Create] (service):", createError);
            throw new Error("No s'ha pogut crear el nou contacte.");
        }
        contactId = newContact.id;
        contactCreated = true; 
    }

    // 6. Preparar les dades inicials
    const initialData: NetworkContactData = {
        contactId: String(contactId),
        subject: `Consulta sobre el projecte: ${projectTitle}`,
        body: `<p>Hola ${recipientName},</p><p><br></p><p>Estic interessat/da en el vostre projecte "<strong>${projectTitle}</strong>" que he vist a la xarxa de Ribotflow.</p><p><br></p><p>Salutacions,</p>`,
    };

    return { data: initialData, contactCreated };
}