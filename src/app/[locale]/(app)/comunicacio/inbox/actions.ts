/**
 * actions.ts (Inbox) - Server Actions
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ticketSchema, type Ticket } from "@/types/comunicacio/inbox";
import type { TicketFilter } from "@/types/comunicacio/inbox";
import { cookies } from "next/headers";
import z from "zod";

interface ActionResult {
  success: boolean;
  message?: string;
}


/**
 * Retorna el cuerpo de un tique. RLS asegura que solo podamos leer tiques del equipo activo.
 */
export async function getTicketBodyAction(ticketId: number): Promise<{ body: string }> {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { body: "<p>Error: Usuario no autenticado</p>" };

  // La política RLS de 'tickets' se encargará de la seguridad
  const { data, error } = await supabase
    .from("tickets")
    .select("body")
    .eq("id", ticketId)
    .single();

  if (error) {
    console.error("Error fetching ticket body:", error);
    return { body: "<p>Error cargando el cuerpo del tique.</p>" };
  }
  return { body: data.body ?? "<p>(Sin contenido)</p>" };
}

/**
 * Elimina un tique. RLS se encarga de la seguridad.
 */
export async function deleteTicketAction(ticketId: number): Promise<ActionResult> {
  const supabase = createClient(cookies());
  const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
  if (error) {
    return { success: false, message: "No se ha podido eliminar el tique." };
  }
  revalidatePath("/comunicacio/inbox");
  return { success: true, message: "Tique eliminado." };
}

/**
 * Marca un tique como leído. RLS se encarga de la seguridad.
 */
export async function markTicketAsReadAction(ticketId: number): Promise<ActionResult> {
  const supabase = createClient(cookies());
  const { error } = await supabase.from("tickets").update({ status: "Llegit" }).eq("id", ticketId);
  if (error) {
    return { success: false, message: "No se ha podido marcar como leído." };
  }
  revalidatePath("/comunicacio/inbox");
  return { success: true };
}

/**
 * Guarda un remitent com a nou contacte a l'equip actiu.
 */
export async function saveSenderAsContactAction(ticket: Ticket): Promise<ActionResult> {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ticket.sender_email) return { success: false, message: "Dades invàlides." };

  const activeTeamId = user.app_metadata?.active_team_id;
  if (!activeTeamId) return { success: false, message: "No s'ha pogut determinar l'equip actiu." };

  try {
      const { data: newContact } = await supabase
          .from("contacts")
          .insert({
              user_id: user.id,
              team_id: activeTeamId,
              nom: ticket.sender_name || ticket.sender_email,
              email: ticket.sender_email,
              estat: "Lead",
          })
          .select('id')
          .single()
          .throwOnError();

      // Actualitzem tots els tiquets d'aquest remitent dins de l'equip actiu.
      await supabase
          .from("tickets")
          .update({ contact_id: newContact.id })
          .eq("team_id", activeTeamId)
          .eq("sender_email", ticket.sender_email);

      revalidatePath("/comunicacio/inbox");
      return { success: true, message: "Contacte desat i vinculat." };
  } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconegut";
      return { success: false, message };
  }
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
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { success: false, message: "No autenticado." };
  const activeTeamId = user.app_metadata?.active_team_id;
 
  if (!activeTeamId) return { success: false, message: "No hay equipo activo." };
 
  if (!user) return { success: false, message: "No autenticat." };

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
 * Carga tiques de forma paginada para el equipo activo, validando los datos con Zod.
 */

export async function loadMoreTicketsAction(page: number, filter: TicketFilter): Promise<Ticket[]> {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const activeTeamId = user.app_metadata?.active_team_id;
  if (!activeTeamId) return [];

  const { data: permissions } = await supabase.from('inbox_permissions').select('target_user_id').eq('team_id', activeTeamId).eq('grantee_user_id', user.id);
  const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id) || [])];
  
  const ITEMS_PER_PAGE = 50;
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
      .from("tickets")
      .select(`*, contacts(*)`)
      .eq('team_id', activeTeamId)
      .in('user_id', visibleUserIds)
      .order("sent_at", { ascending: false })
      .range(from, to);

  if (filter === "rebuts" || filter === "noLlegits") query = query.or("type.eq.rebut,type.is.null");
  else if (filter === "enviats") query = query.eq("type", "enviat");

  const { data, error } = await query;
  if (error) {
      console.error("Error loading more tickets:", error);
      return [];
  }
  
  const validation = z.array(ticketSchema).safeParse(data);
  if (!validation.success) {
      console.error("Error de validació (Zod) a loadMoreTicketsAction:", validation.error);
      return [];
  }
  
  return validation.data;
}

/**
 * loadAllTicketsAction - retorna TOTS els tiquets (sense límit) segons el filtre.
 * Útil quan l'usuari fa click a "Tots" i vol veure absolutament tot.
 */
export async function loadAllTicketsAction(filter: TicketFilter): Promise<Ticket[]> {
  const supabase = createClient(cookies())
    ;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

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
