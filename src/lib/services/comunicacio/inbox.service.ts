// src/lib/services/comunicacio/inbox.service.ts
"use server";

import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type {
    Contact,
    DbTableInsert,
    EnrichedTicket,
    InboxPermission,
    Pipeline, // ✅ 1. Importem el tipus Pipeline
    TeamMemberWithProfile,
    Template,
    TicketFilter,
    TicketForSupplier,
} from "@/types/db";
import { getTeamMembersWithProfiles } from "@/lib/supabase/teams";
// ✅ 2. Importem des de la RUTA CORRECTA (sense typo)
import { getPipelinesForTeam } from '@/lib/services/crm/pipeline/pipline.service'; 

export type InboxInitialData = {
  permissions: InboxPermission[];
  teamMembers: TeamMemberWithProfile[];
  allTeamContacts: Contact[];
  templates: Template[];
  pipelines: Pick<Pipeline, 'id' | 'name'>[]; // ✅ 3. Afegim pipelines (Pick és correcte)
  receivedCount: number;
  sentCount: number;
  tickets: EnrichedTicket[];
};

export type InboxDataError = {
  permissionsError?: PostgrestError | null;
  teamMembersError?: PostgrestError | { message: string } | null;
  contactsError?: PostgrestError | null;
  templatesError?: PostgrestError | null;
  pipelinesError?: PostgrestError | null; // ✅ 4. Afegim error de pipelines
  receivedCountError?: PostgrestError | null;
  sentCountError?: PostgrestError | null;
  ticketsError?: PostgrestError | null;
};

export async function getInboxInitialData(
  supabase: SupabaseClient<Database>,
  userId: string,
  teamId: string
): Promise<{ data: InboxInitialData | null; error: InboxDataError | null }> {
  
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

  // ✅ 5. Executem la consulta de pipelines en paral·lel
  const [
    teamMembersRes,
    allTeamContactsRes,
    templatesRes,
    pipelinesRes, // ✅ AFEGIT
    receivedCountRes,
    sentCountRes,
    ticketsRes
  ] = await Promise.all([
    getTeamMembersWithProfiles(supabase, teamId),
    supabase.from('contacts').select('*').eq('team_id', teamId),
    supabase.from("email_templates").select("*").eq('team_id', teamId),
    getPipelinesForTeam(supabase, teamId), // ✅ AFEGIT
    supabase.rpc('get_inbox_received_count', { p_visible_user_ids: visibleUserIds }),
    supabase.rpc('get_inbox_sent_count', { p_visible_user_ids: visibleUserIds }),
    supabase.rpc('get_inbox_tickets', {
      p_visible_user_ids: visibleUserIds,
      p_limit: 50,
      p_offset: 0,
      p_search_term: '',
      p_active_filter: ''
    })
  ]);

  // ✅ 6. Comprovem errors
  const errors: InboxDataError = {};
  if (teamMembersRes.error) errors.teamMembersError = teamMembersRes.error;
  if (allTeamContactsRes.error) errors.contactsError = allTeamContactsRes.error;
  if (templatesRes.error) errors.templatesError = templatesRes.error;
  if (pipelinesRes.error) errors.pipelinesError = pipelinesRes.error; // ✅ AFEGIT
  if (receivedCountRes.error) errors.receivedCountError = receivedCountRes.error;
  if (sentCountRes.error) errors.sentCountError = sentCountRes.error;
  if (ticketsRes.error) errors.ticketsError = ticketsRes.error;

  if (Object.keys(errors).length > 0) {
    console.error("Error(s) a getInboxInitialData (service):", errors);
    if (permissionsError) errors.permissionsError = permissionsError;
    return { data: null, error: errors };
  }

  // ✅ 7. Construïm les dades
  const data: InboxInitialData = {
    permissions: safePermissions,
    teamMembers: (teamMembersRes.data as TeamMemberWithProfile[]) || [],
    allTeamContacts: (allTeamContactsRes.data as Contact[]) || [],
    templates: (templatesRes.data as Template[]) || [],
    pipelines: (pipelinesRes.data as Pick<Pipeline, 'id' | 'name'>[]) || [], // ✅ AFEGIT
    receivedCount: receivedCountRes.data || 0,
    sentCount: sentCountRes.data || 0,
    tickets: (ticketsRes.data as unknown as EnrichedTicket[] || [])
  };

  return { data, error: null };
}

// ... (la resta de funcions del servei no canvien)
// ---
// ⚙️ SERVEIS DE GESTIÓ DE TIQUETS
// ---

/**
 * SERVEI: Retorna el cos d'un tiquet.
 */
export async function getTicketBody(
    supabase: SupabaseClient<Database>,
    ticketId: number,
): Promise<string> {
    const { data, error } = await supabase
        .from("tickets")
        .select("body")
        .eq("id", ticketId)
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
    ticketId: number,
): Promise<void> {
    const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketId);

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
    ticketId: number,
): Promise<void> {
    const { error } = await supabase
        .from("tickets")
        .update({ status: "Llegit" })
        .eq("id", ticketId);

    if (error) {
        console.error("Error a markTicketAsRead (service):", error);
        throw new Error("No s'ha pogut marcar com a llegit.");
    }
}

/*
 * ❌ ELIMINAT: La funció 'sendEmail' s'ha mogut a 'email.service.ts'
 */

/**
 * SERVEI: Assigna un tiquet a un tracte (opportunity).
 */
export async function assignTicket(
    supabase: SupabaseClient<Database>,
    ticketId: number,
    dealId: number,
    teamId: string,
): Promise<void> {
    const newAssignment: DbTableInsert<"ticket_assignments"> = {
        ticket_id: ticketId,
        team_id: teamId,
        deal_id: dealId,
    };

    const { error } = await supabase.from("ticket_assignments").insert(
        newAssignment,
    );

    if (error) {
        console.error("Error en assignar el tiquet (service):", error);
        throw new Error("No s'ha pogut assignar el tiquet.");
    }
}

/**
 * SERVEI: Carrega més tiquets de forma paginada.
 */
export async function loadMoreTickets(
    supabase: SupabaseClient<Database>,
    page: number,
    filter: TicketFilter,
    inboxOwnerId: string,
    userId: string,
    teamId: string,
): Promise<EnrichedTicket[]> {
    const { data: permissions } = await supabase
        .from("inbox_permissions")
        .select("target_user_id")
        .eq("team_id", teamId)
        .eq("grantee_user_id", userId);

    const allVisibleUserIds = [
        userId,
        ...(permissions?.map((p) => p.target_user_id) || []),
    ];
    const visibleUserIds = inboxOwnerId === "all"
        ? allVisibleUserIds
        : [inboxOwnerId];
    const ITEMS_PER_PAGE = 50;
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const rpcFilter = filter === "tots" ? "" : filter; // La RPC espera '' per a 'tots'

    // Utilitzem la RPC per coherència amb 'getTickets'
    const { data, error } = await supabase.rpc("get_inbox_tickets", {
        p_visible_user_ids: visibleUserIds,
        p_limit: ITEMS_PER_PAGE,
        p_offset: offset,
        p_search_term: "",
        p_active_filter: rpcFilter,
    });

    if (error) {
        console.error("Error loading more tickets (service):", error);
        return [];
    }

    return (data ?? []) as unknown as EnrichedTicket[];
}

/**
 * SERVEI: Afegeix un email a la llista negra.
 */
export async function addToBlacklist(
    supabase: SupabaseClient<Database>,
    emailToBlock: string,
    userId: string,
    teamId: string,
): Promise<void> {
    const cleanedEmail = emailToBlock.trim().toLowerCase();
    if (!cleanedEmail) {
        throw new Error("L'email no pot estar buit.");
    }

    const newRule: DbTableInsert<"blacklist_rules"> = {
        team_id: teamId,
        user_id: userId,
        value: cleanedEmail,
        rule_type: "email",
    };
    await supabase.from("blacklist_rules").insert(newRule).throwOnError();
}

/**
 * SERVEI: Vincula tots els tiquets d'un remitent a un contacte existent.
 */
export async function linkTicketsToContact(
    supabase: SupabaseClient<Database>,
    contactId: number,
    senderEmail: string,
    userId: string,
): Promise<void> {
    // ATENCIÓ: Aquesta lògica potser s'hauria de revisar.
    // Actualitza tiquets de l'usuari actual (userId) que coincideixen amb el sender_email.
    const { error } = await supabase
        .from("tickets")
        .update({ contact_id: contactId })
        .eq("user_id", userId)
        .eq("sender_email", senderEmail.toLowerCase());

    if (error) {
        console.error("Error a linkTicketsToContact (service):", error);
        throw new Error("Error desconegut al vincular tiquets.");
    }
}

/**
 * SERVEI: Carrega tiquets de forma paginada o per cerca usant RPC.
 */
export async function getTickets(
    supabase: SupabaseClient<Database>,
    page: number,
    filter: TicketFilter,
    inboxOwnerId: string,
    searchTerm: string,
    userId: string,
    teamId: string,
): Promise<EnrichedTicket[]> {
    const { data: permissions } = await supabase
        .from("inbox_permissions")
        .select("target_user_id")
        .eq("team_id", teamId)
        .eq("grantee_user_id", userId);

    const allVisibleUserIds = [
        userId,
        ...(permissions?.map((p) => p.target_user_id) || []),
    ];
    const visibleUserIds = inboxOwnerId === "all"
        ? allVisibleUserIds
        : [inboxOwnerId];
    const ITEMS_PER_PAGE = 50;
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const rpcFilter = filter === "tots" ? "" : filter;

    const { data, error } = await supabase.rpc("get_inbox_tickets", {
        p_visible_user_ids: visibleUserIds,
        p_limit: ITEMS_PER_PAGE,
        p_offset: offset,
        p_search_term: searchTerm,
        p_active_filter: rpcFilter,
    });

    if (error) {
        console.error("Error a getTickets (service):", error);
        return [];
    }
    return (data ?? []) as unknown as EnrichedTicket[];
}

/**
 * SERVEI: Carrega un tiquet específic pel seu ID.
 */
export async function getTicketById(
    supabase: SupabaseClient<Database>,
    ticketId: number,
    userId: string,
    teamId: string,
): Promise<EnrichedTicket | null> {
    const { data: permissions } = await supabase
        .from("inbox_permissions")
        .select("target_user_id")
        .eq("team_id", teamId)
        .eq("grantee_user_id", userId);

    const visibleUserIds = [
        userId,
        ...(permissions?.map((p) => p.target_user_id) || []),
    ];

    const { data: ticket, error } = await supabase
        .from("enriched_tickets")
        .select("*")
        .eq("id", ticketId)
        .in("user_id", visibleUserIds)
        .limit(1)
        .single();

    if (error) {
        console.error("Error in getTicketById (service):", error);
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
    teamId: string,
): Promise<TicketForSupplier[]> {
    // 1. Obté els IDs dels contactes
    const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id")
        .eq("supplier_id", supplierId)
        .eq("team_id", teamId);

    if (contactsError) {
        console.error(
            "Error fetching contacts for supplier (service):",
            contactsError,
        );
        return [];
    }

    if (!contacts || contacts.length === 0) {
        return [];
    }

    const contactIds = contacts.map((c) => c.id);

    // 2. Obté els tickets per a aquests contactes
    const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select(
            `
      *, 
      contacts!inner (
        id, 
        nom,
        email
      )
      `,
        )
        .in("contact_id", contactIds)
        .eq("contacts.team_id", teamId)
        .order("sent_at", { ascending: false });

    if (ticketsError) {
        console.error(
            "Error fetching tickets for supplier contacts (service):",
            ticketsError,
        );
        return [];
    }

    return (tickets as unknown as TicketForSupplier[]) || [];
}

/**
 * SERVEI: Elimina múltiples tiquets alhora.
 * Llança un error si falla.
 */
export async function deleteMultipleTickets(
    supabase: SupabaseClient<Database>,
    ticketIds: number[],
): Promise<void> {
    if (!ticketIds || ticketIds.length === 0) {
        throw new Error("No s'han proporcionat tiquets per eliminar.");
    }

    const { error } = await supabase
        .from("tickets")
        .delete()
        .in("id", ticketIds);

    if (error) {
        console.error("Error en l'esborrat múltiple (service):", error);
        throw new Error("No s'han pogut eliminar els tiquets.");
    }
}

/*
 * ❌ ELIMINAT: La funció 'prepareNetworkContact' s'ha mogut a 'email.service.ts'
 */
