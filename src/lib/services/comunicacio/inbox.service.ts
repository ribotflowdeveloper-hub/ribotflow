import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase'; // Importem Tables
import type { Contact, EnrichedTicket, TeamMemberWithProfile, Template, InboxPermission } from '@/types/db'; // Assegurem que la ruta és correcta
import { getTeamMembersWithProfiles } from "@/lib/supabase/teams"; // Mantenim la importació específica

// --- Tipus de Retorn del Servei ---
export type InboxInitialData = {
    permissions: InboxPermission[];
    teamMembers: TeamMemberWithProfile[];
    allTeamContacts: Contact[];
    templates: Template[];
    receivedCount: number;
    sentCount: number;
    tickets: EnrichedTicket[];
};

// Tipus per a errors detallats
export type InboxDataError = {
    permissionsError?: PostgrestError | null;
    teamMembersError?: PostgrestError | { message: string } | null; // getTeamMembers pot retornar { error: { message: '...' } }
    contactsError?: PostgrestError | null;
    templatesError?: PostgrestError | null;
    receivedCountError?: PostgrestError | null;
    sentCountError?: PostgrestError | null;
    ticketsError?: PostgrestError | null;
};

/**
 * Obté totes les dades inicials necessàries per a la pàgina de l'Inbox.
 *
 * @param supabase Client Supabase autenticat.
 * @param userId ID de l'usuari actual.
 * @param teamId ID de l'equip actiu.
 * @returns Objecte amb les dades o un error detallat.
 */
export async function getInboxInitialData(
    supabase: SupabaseClient<Database>,
    userId: string,
    teamId: string
): Promise<{ data: InboxInitialData | null; error: InboxDataError | null }> {

    // 1. Obtenir permisos de l'usuari
    const { data: permissions, error: permissionsError } = await supabase
        .from('inbox_permissions')
        .select('*')
        .eq('team_id', teamId)
        .eq('grantee_user_id', userId);

    if (permissionsError) {
        console.error("Error en carregar els permisos de l'inbox (service):", permissionsError);
        // Retornem error aviat si els permisos fallen, ja que són necessaris per a altres consultes
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
        getTeamMembersWithProfiles(supabase, teamId), // Funció específica
        supabase.from('contacts').select('*').eq('team_id', teamId),
        supabase.from("email_templates").select("*").eq('team_id', teamId),
        supabase.rpc('get_inbox_received_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_sent_count', { p_visible_user_ids: visibleUserIds }),
        supabase.rpc('get_inbox_tickets', {
            p_user_id: userId,
            p_team_id: teamId,
            p_visible_user_ids: visibleUserIds,
            p_limit: 50, // Límit inicial
            p_offset: 0, // Offset inicial
            p_search_term: '', // Terme de cerca inicial buit
            p_active_filter: '' // Afegim el filtre actiu per defecte (buit)
        })
    ]);

    // 3. Comprovar errors de les consultes paral·leles
    const errors: InboxDataError = {};
    if (teamMembersRes.error) errors.teamMembersError = teamMembersRes.error;
    if (allTeamContactsRes.error) errors.contactsError = allTeamContactsRes.error;
    if (templatesRes.error) errors.templatesError = templatesRes.error;
    if (receivedCountRes.error) errors.receivedCountError = receivedCountRes.error;
    if (sentCountRes.error) errors.sentCountError = sentCountRes.error;
    if (ticketsRes.error) errors.ticketsError = ticketsRes.error;

    if (Object.keys(errors).length > 0) {
        console.error("Error(s) a getInboxInitialData (service):", errors);
        // Afegim l'error de permisos si ja existia
        if (permissionsError) errors.permissionsError = permissionsError;
        return { data: null, error: errors };
    }

    // 4. Construir i retornar les dades
    const data: InboxInitialData = {
        permissions: safePermissions,
        teamMembers: (teamMembersRes.data as TeamMemberWithProfile[]) || [], // Casting necessari si getTeamMembers retorna any
        allTeamContacts: (allTeamContactsRes.data as Contact[]) || [],
        templates: (templatesRes.data as Template[]) || [],
        receivedCount: receivedCountRes.data || 0,
        sentCount: sentCountRes.data || 0,
        tickets: (ticketsRes.data as EnrichedTicket[] || [])
    };

    return { data, error: null };
}

// Podries afegir aquí la funció per obtenir més tiquets (paginació/cerca)
// export async function getInboxTickets(...) -> cridaria a supabase.rpc('get_inbox_tickets', ...)