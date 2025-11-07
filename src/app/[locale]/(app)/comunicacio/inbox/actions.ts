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

import * as inboxService from "@/lib/services/comunicacio/inbox.service";
import * as emailService from "@/lib/services/comunicacio/email.service";
import type { NetworkContactData } from "@/lib/services/comunicacio/email.service";

// ✅ 1. Importem el client Admin
import { createAdminClient } from "@/lib/supabase/admin";

// --- Tipus d'Acció Estàndard ---
interface ActionResult {
  success: boolean;
  message?: string;
}

// --- Accions (La resta de funcions no canvien) ---

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
export async function deleteTicketAction(
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
    await inboxService.deleteTicket(supabase, ticketId);
    revalidatePath("/comunicacio/inbox");
    return { success: true, message: "Tiquet eliminat." };
  } catch (error: unknown) {
    return { success: false, message: (error as Error).message };
  }
}
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
    return (tickets as TicketForSupplier[]) || [];
  } catch (error: unknown) {
    console.error(
      "Error fetching tickets for supplier contacts (action):",
      error,
    );
    return [];
  }
}
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

//
// --- ❗ ACCIÓ CORREGIDA ❗ ---
//
export async function prepareNetworkContactAction(
  recipientTeamId: string,
  projectId: string,
): Promise<{
  success: boolean;
  data?: NetworkContactData;
  message?: string;
}> {
  // 1. Validem la sessió de l'usuari (remitent) i el seu ús.
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_INBOX,
    "maxTickets",
  );
  if ("error" in validation) {
    return { success: false, message: validation.error.message };
  }
  
  // 2. Obtenim el client RLS de l'usuari i el seu ID d'equip.
  // Canviem el nom de 'supabase' a 'userSupabase' per evitar confusions.
  const { supabase: userSupabase, activeTeamId } = validation;

  // 3. Obtenim l'equip actiu (el remitent) utilitzant el SEU client RLS.
  const activeTeam = await getActiveTeam(userSupabase, activeTeamId);
  if (!activeTeam) {
    return { success: false, message: "No s'ha trobat l'equip actiu." };
  }

  // ✅ 4. Creem un client ADMIN.
  // Aquest client s'usarà per llegir dades públiques (projecte, equip destinatari)
  // saltant les polítiques RLS.
  const supabaseAdmin = createAdminClient();

  try {
    // 5. Cridem al servei passant el client ADMIN.
    const { data, contactCreated } = await emailService
      .prepareNetworkContact(
        supabaseAdmin, // ✅ Passem el client Admin
        recipientTeamId,
        projectId,
        activeTeam, // L'objecte de l'equip remitent (ja l'hem obtingut)
      );

    if (contactCreated) {
      // Revalidem el path del CRM de l'usuari actiu.
      revalidatePath(`/${activeTeam.id}/crm/contacts`);
    }

    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "Error desconegut preparant el missatge.";
    // L'error 'PGRST116' (0 rows) que veies hauria de desaparèixer.
    console.error("Error a prepareNetworkContactAction:", message);
    return { success: false, message };
  }
}


/**
 * ✅ ACCIÓ ACTUALITZADA: Envia email i crea el contacte/oportunitat.
 */
interface SendEmailWithManualCreateParams {
  contactId: number | null; 
  manualEmail: string | null; 
  subject: string;
  htmlBody: string;
  selectedPipelineId: number | null; 
}

export async function sendEmailActionWithManualCreate({
  contactId,
  manualEmail,
  subject,
  htmlBody,
  selectedPipelineId,
}: SendEmailWithManualCreateParams): Promise<ActionResult> {
  
  // 1. Validació de Permís i Ús
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_INBOX,
    "maxTickets", 
  );
  if ("error" in validation) {
    return { success: false, message: validation.error.message };
  }
  const { supabase, user, activeTeamId } = validation;

  // 2. Validació de Destinatari
  if (!contactId && !manualEmail) {
    return { success: false, message: "No s'ha especificat cap destinatari." };
  }

  try {
    // 3. Cridar al SERVEI D'EMAIL
    await emailService.sendEmail({
      supabase,
      contactId, 
      manualEmail, 
      subject,
      htmlBody,
      userId: user.id,
      teamId: activeTeamId,
      selectedPipelineId: selectedPipelineId,
    });

    // 4. Gestionar Infraestructura
    revalidatePath("/comunicacio/inbox");
    revalidatePath("/crm/contactes"); 
    
    if (selectedPipelineId !== null) { 
      revalidatePath("/crm/pipeline"); 
    }
    return { success: true, message: "Correu enviat correctament." };
  
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "Error desconegut";
    console.error("Error en sendEmailActionWithManualCreate:", message);
    return { success: false, message };
  }
}