// src/app/[locale]/(app)/comunicacio/inbox/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getActiveTeam } from "@/lib/supabase/teams";
import type {
    EnrichedTicket,
    TicketFilter,
    TicketForSupplier,
} from "@/types/db";
import {
    PERMISSIONS,
    validateActionAndUsage,
    validateSessionAndPermission,
} from "@/lib/permissions/permissions";
// ✅ 1. Importem TOT el nostre servei
import * as inboxService from "@/lib/services/comunicacio/inbox.service";
import type { NetworkContactData } from "@/lib/services/comunicacio/inbox.service";

// --- Tipus d'Acció Estàndard ---
interface ActionResult {
    success: boolean;
    message?: string;
}

// --- Accions Refactoritzades ---

/**
 * ACCIÓ: Retorna el cos d'un tiquet.
 * (Acció de lectura, no retorna ActionResult)
 */
export async function getTicketBodyAction(
    ticketId: number,
): Promise<{ body: string }> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );

    if ("error" in session) {
        return { body: `<p>Error: ${session.error.message}</p>` };
    }

    const { supabase } = session;

    try {
        // 2. Cridem al servei
        const body = await inboxService.getTicketBody(supabase, ticketId);
        return { body };
    } catch (error: unknown) {
        console.error(
            "Error en getTicketBodyAction:",
            (error as Error).message,
        );
        return { body: "<p>Error carregant el cos del tiquet.</p>" };
    }
}

/**
 * ACCIÓ: Elimina un tiquet.
 */
export async function deleteTicketAction(
    ticketId: number,
): Promise<ActionResult> {
    // 1. Validar Sessió
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        // 2. Cridar al SERVEI
        await inboxService.deleteTicket(supabase, ticketId);

        // 3. Gestionar Infraestructura
        revalidatePath("/comunicacio/inbox");
        return { success: true, message: "Tiquet eliminat." };
    } catch (error: unknown) {
        // 4. Gestionar errors del servei
        return { success: false, message: (error as Error).message };
    }
}

/**
 * ACCIÓ: Marca un tiquet com a llegit.
 */
export async function markTicketAsReadAction(
    ticketId: number,
): Promise<ActionResult> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        await inboxService.markTicketAsRead(supabase, ticketId);
        revalidatePath("/comunicacio/inbox", "page");
        return { success: true };
    } catch (error: unknown) {
        return { success: false, message: (error as Error).message };
    }
}

/**
 * ACCIÓ: sendEmailAction
 */
interface SendEmailParams {
    contactId: number;
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
    // 1. Validar Sessió
    // ✅ 5. VALIDACIÓ 3-EN-1 (Sessió + Rol + Límit)
    // Aquesta acció CREA un tiquet ("enviat"), per tant ha de comprovar el límit.
    const validation = await validateActionAndUsage(
        PERMISSIONS.MANAGE_INBOX, // Té permís de Rol?
        "maxTickets", // Té espai al Pla?
    );
    if ("error" in validation) {
        return { success: false, message: validation.error.message };
    }
    const { supabase, user, activeTeamId } = validation;

    try {
        // 2. Cridar al SERVEI
        await inboxService.sendEmail({
            supabase,
            contactId,
            subject,
            htmlBody,
            isReply,
            userId: user.id,
            teamId: activeTeamId,
        });

        // 3. Gestionar Infraestructura
        revalidatePath("/comunicacio/inbox");
        return { success: true, message: "Correu enviat correctament." };
    } catch (error: unknown) {
        // 4. Gestionar errors
        const message = error instanceof Error
            ? error.message
            : "Error desconegut";
        console.error("Error en sendEmailAction:", message);
        return { success: false, message };
    }
}

/**
 * ACCIÓ: Assigna un tiquet a un tracte (opportunity).
 */
export async function assignTicketAction(
    ticketId: number,
    dealId: number,
): Promise<ActionResult> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    try {
        await inboxService.assignTicket(
            supabase,
            ticketId,
            dealId,
            activeTeamId,
        );
        revalidatePath("/comunicacio/inbox");
        return { success: true, message: "Tiquet assignat." };
    } catch (error: unknown) {
        console.error("Error en assignar el tiquet (action):", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * ACCIÓ: Carrega més tiquets de forma paginada.
 * (Acció de lectura)
 */
export async function loadMoreTicketsAction(
    page: number,
    filter: TicketFilter,
    inboxOwnerId: string,
): Promise<EnrichedTicket[]> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) return [];
    const { supabase, user, activeTeamId } = session;

    try {
        return await inboxService.loadMoreTickets(
            supabase,
            page,
            filter,
            inboxOwnerId,
            user.id,
            activeTeamId,
        );
    } catch (error: unknown) {
        console.error("Error loading more tickets (action):", error);
        return [];
    }
}

/**
 * ACCIÓ: Afegeix un email a la llista negra.
 */
export async function addToBlacklistAction(
    emailToBlock: string,
): Promise<ActionResult> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    try {
        await inboxService.addToBlacklist(
            supabase,
            emailToBlock,
            user.id,
            activeTeamId,
        );
        revalidatePath("/comunicacio/inbox");
        return {
            success: true,
            message: `${emailToBlock} ha estat afegit a la llista negra.`,
        };
    } catch (error) {
        // ✅ Gestionem l'error de clau duplicada
        if (
            error instanceof Error &&
            (error.message.includes("duplicate key") ||
                error.message.includes("23505"))
        ) {
            return {
                success: false,
                message: "Aquest correu ja és a la llista negra.",
            };
        }
        console.error("Error afegint a la blacklist (action):", error);
        const message = error instanceof Error
            ? error.message
            : "Error desconegut.";
        return { success: false, message };
    }
}

/**
 * ACCIÓ: Vincula tots els tiquets d'un remitent a un contacte existent.
 */
export async function linkTicketsToContactAction(
    contactId: number,
    senderEmail: string,
): Promise<ActionResult> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user } = session;

    try {
        await inboxService.linkTicketsToContact(
            supabase,
            contactId,
            senderEmail,
            user.id,
        );
        revalidatePath("/comunicacio/inbox");
        return { success: true, message: "Contacte vinculat correctament." };
    } catch (error: unknown) {
        const message = error instanceof Error
            ? error.message
            : "Error desconegut al vincular tiquets.";
        return { success: false, message };
    }
}

/**
 * ACCIÓ: Carrega tiquets de forma paginada o per cerca.
 * (Acció de lectura)
 */
export async function getTicketsAction(
    page: number,
    filter: TicketFilter,
    inboxOwnerId: string,
    searchTerm: string = "",
): Promise<EnrichedTicket[]> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) return [];
    const { supabase, user, activeTeamId } = session;

    try {
        return await inboxService.getTickets(
            supabase,
            page,
            filter,
            inboxOwnerId,
            searchTerm,
            user.id,
            activeTeamId,
        );
    } catch (error: unknown) {
        console.error("Error a getTicketsAction (action):", error);
        return [];
    }
}

/**
 * ACCIÓ: Carrega un tiquet específic pel seu ID.
 * (Acció de lectura, retorna format de dades/error per al client)
 */
export async function getTicketByIdAction(
    ticketId: number,
): Promise<{ data: EnrichedTicket | null; error: string | null }> {
    try {
        const session = await validateSessionAndPermission(
            PERMISSIONS.MANAGE_INBOX,
        );
        if ("error" in session) throw new Error(session.error.message);
        const { supabase, user, activeTeamId } = session;
        if (!user) throw new Error("User not authenticated");

        const ticket = await inboxService.getTicketById(
            supabase,
            ticketId,
            user.id,
            activeTeamId,
        );

        if (!ticket) {
            return {
                data: null,
                error:
                    "No s'ha pogut trobar el correu (accés denegat o no existeix).",
            };
        }
        return { data: ticket, error: null };
    } catch (err: unknown) {
        console.error("Error in getTicketByIdAction (action):", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
            data: null,
            error: `Error intern en carregar el tiquet: ${errorMessage}`,
        };
    }
}

/**
 * ACCIÓ: Obté els tickets dels contactes associats a un proveïdor.
 * (Acció de lectura)
 */
export async function fetchTicketsForSupplierContacts(
    supplierId: string,
): Promise<TicketForSupplier[]> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) return [];
    const { supabase, activeTeamId } = session;

    try {
        const tickets = await inboxService.fetchTicketsForSupplierContacts(
            supabase,
            supplierId,
            activeTeamId,
        );
        // Fem un 'cast' per assegurar que les dades retornades compleixen amb la nostra interface.
        return (tickets as TicketForSupplier[]) || [];
    } catch (error: unknown) {
        console.error(
            "Error fetching tickets for supplier contacts (action):",
            error,
        );
        return [];
    }
}

/**
 * ACCIÓ: Elimina múltiples tiquets alhora.
 */
export async function deleteMultipleTicketsAction(
    ticketIds: number[],
): Promise<ActionResult> {
    const session = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_INBOX,
    );
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        await inboxService.deleteMultipleTickets(supabase, ticketIds);
        revalidatePath("/comunicacio/inbox");
        return { success: true, message: "Tiquets eliminats." };
    } catch (error: unknown) {
        console.error("Error en l'esborrat múltiple (action):", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * ACCIÓ: Prepara les dades per a un nou missatge de Network.
 * (Acció mixta de lectura/escriptura, retorna dades o error)
 */
export async function prepareNetworkContactAction(
    recipientTeamId: string,
    projectId: string,
): Promise<{
    success: boolean;
    data?: NetworkContactData;
    message?: string;
}> {
    // ✅ 14. SEGURETAT (RBAC): Per contactar, has de poder GESTIONAR l'inbox.
    // També comprovem el límit de 'maxTickets' perquè això crearà un tiquet "enviat".
    const validation = await validateActionAndUsage(
        PERMISSIONS.MANAGE_INBOX,
        "maxTickets",
    );
    if ("error" in validation) {
        return { success: false, message: validation.error.message };
    }
    const { supabase, activeTeamId } = validation;

    // Obtenim l'equip actiu (necessari per al servei)
    const activeTeam = await getActiveTeam(supabase, activeTeamId);
    if (!activeTeam) {
        return { success: false, message: "No s'ha trobat l'equip actiu." };
    }

    try {
        // 1. Cridem al servei
        const { data, contactCreated } = await inboxService
            .prepareNetworkContact(
                supabase,
                recipientTeamId,
                projectId,
                activeTeam,
            );

        // 2. Revalidem si s'ha creat un contacte
        if (contactCreated) {
            revalidatePath(`/${activeTeam.id}/crm/contacts`);
        }

        // 3. Retornem èxit amb les dades
        return { success: true, data };
    } catch (error: unknown) {
        // 4. Gestionem errors del servei
        const message = error instanceof Error
            ? error.message
            : "Error desconegut preparant el missatge.";
        console.error("Error a prepareNetworkContactAction:", message);
        return { success: false, message };
    }
}
