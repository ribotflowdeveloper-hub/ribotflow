"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Ticket } from "./page";

interface ActionResult {
  success: boolean;
  message?: string;
}

interface Contact {
  id: string;
  nom: string;
  email: string;
  estat: string;
  user_id: string;
}

interface Opportunity {
  id: string;
}

export async function deleteTicketAction(ticketId: number): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticat." };

  const { error } = await supabase.from("tickets").delete().match({ id: ticketId, user_id: user.id });

  if (error) {
    return { success: false, message: "No s'ha pogut eliminar el tiquet." };
  }

  revalidatePath("/comunicacio/inbox");
  return { success: true, message: "Tiquet eliminat." };
}

export async function markTicketAsReadAction(ticketId: number): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticat." };

  const { error } = await supabase.from("tickets").update({ status: "Llegit" }).match({ id: ticketId, user_id: user.id });

  if (error) {
    return { success: false, message: "No s'ha pogut marcar com a llegit." };
  }

  revalidatePath("/comunicacio/inbox");
  return { success: true };
}

export async function saveSenderAsContactAction(ticket: Ticket): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ticket.sender_email) return { success: false, message: "Dades invàlides." };

  try {
    const { data: newContact, error: insertError } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        nom: ticket.sender_name || ticket.sender_email,
        email: ticket.sender_email,
        estat: "Lead",
      })
      .select()
      .single<Contact>();

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("tickets")
      .update({ contact_id: newContact.id })
      .eq("user_id", user.id)
      .eq("sender_email", ticket.sender_email);

    if (updateError) throw updateError;

    revalidatePath("/comunicacio/inbox");
    return { success: true, message: "Contacte desat i vinculat." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

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
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticat." };

  try {
    const { error: emailError } = await supabase.functions.invoke("send-email", {
      body: { contactId, subject, htmlBody },
    });
    if (emailError) throw new Error(emailError.message);

    if (isReply) {
      const { data: existingOpportunities } = await supabase
        .from("opportunities")
        .select("id")
        .eq("contact_id", contactId)
        .limit(1)
        .returns<Opportunity[]>(); // 👈 tipem la resposta

      if (!existingOpportunities || existingOpportunities.length === 0) {
        await supabase.from("opportunities").insert({
          user_id: user.id,
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
    return { success: false, message: `Error en la Server Action: ${message}` };
  }
}
