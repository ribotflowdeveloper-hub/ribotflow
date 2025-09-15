/**
 * @file actions.ts (Inbox)
 * @summary Aquest fitxer conté totes les Server Actions relacionades amb la gestió de l'Inbox (safata d'entrada).
 * Les Server Actions són funcions que s'executen de manera segura al servidor, mai al navegador del client.
 * Això és ideal per a operacions sensibles com interactuar amb la base de dades o serveis externs.
 */

"use server"; // Directiva de Next.js que marca aquest fitxer sencer per a ser executat només al servidor.

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Ticket } from "./page";

// Interfície per estandarditzar la resposta de les accions.
interface ActionResult {
  success: boolean;
  message?: string;
}

// Interfícies per al tipat de les dades de la base de dades.
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

/**
 * @summary Elimina un tiquet de la base de dades.
 * @param {number} ticketId - L'ID del tiquet a eliminar.
 * @returns {Promise<ActionResult>} Un objecte indicant si l'operació ha tingut èxit.
 */
export async function deleteTicketAction(ticketId: number): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore); // Crea un client de Supabase per al servidor.
  const { data: { user } } = await supabase.auth.getUser(); // Comprovació de seguretat: verifica que hi ha un usuari autenticat.
  if (!user) return { success: false, message: "No autenticat." };

  // Executa l'operació d'eliminació a la taula 'tickets', assegurant que el tiquet pertany a l'usuari connectat.
  const { error } = await supabase.from("tickets").delete().match({ id: ticketId, user_id: user.id });

  if (error) {
    console.error("Error en eliminar el tiquet:", error);
    return { success: false, message: "No s'ha pogut eliminar el tiquet." };
  }

  // Funció clau de Next.js: Invalida la memòria cau de la ruta especificada.
  // Això força a Next.js a recarregar les dades de la pàgina de l'inbox la propera vegada que es visiti,
  // mostrant la llista de tiquets actualitzada sense el que s'ha eliminat.
  revalidatePath("/comunicacio/inbox");
  return { success: true, message: "Tiquet eliminat." };
}

/**
 * @summary Canvia l'estat d'un tiquet a "Llegit".
 * @param {number} ticketId - L'ID del tiquet a marcar.
 * @returns {Promise<ActionResult>} Un objecte indicant si l'operació ha tingut èxit.
 */
export async function markTicketAsReadAction(ticketId: number): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticat." };

  // Actualitza la columna 'status' a "Llegit" per al tiquet especificat.
  const { error } = await supabase.from("tickets").update({ status: "Llegit" }).match({ id: ticketId, user_id: user.id });

  if (error) {
    console.error("Error en marcar el tiquet com a llegit:", error);
    return { success: false, message: "No s'ha pogut marcar com a llegit." };
  }

  revalidatePath("/comunicacio/inbox"); // Actualitzem la UI.
  return { success: true };
}

/**
 * @summary Desa el remitent d'un tiquet com a nou contacte i vincula tots els seus tiquets.
 * @param {Ticket} ticket - L'objecte del tiquet que conté la informació del remitent.
 * @returns {Promise<ActionResult>} Un objecte indicant l'èxit i el missatge corresponent.
 */
export async function saveSenderAsContactAction(ticket: Ticket): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ticket.sender_email) return { success: false, message: "Dades invàlides." };

  try {
    // PAS 1: Inserim un nou contacte a la taula 'contacts'.
    const { data: newContact, error: insertError } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        nom: ticket.sender_name || ticket.sender_email, // Si no hi ha nom, fem servir l'email.
        email: ticket.sender_email,
        estat: "Lead", // Estat inicial per a nous contactes des de l'inbox.
      })
      .select() // Demanem que ens retorni les dades del contacte creat.
      .single<Contact>(); // Esperem un únic resultat.

    if (insertError) throw insertError;

    // PAS 2: Actualitzem TOTS els tiquets que provenen del mateix email per vincular-los al nou contacte.
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
    console.error("Error en desar el contacte:", message);
    return { success: false, message };
  }
}

// Interfície per als paràmetres de la funció d'enviament d'email.
interface SendEmailParams {
  contactId: string;
  subject: string;
  htmlBody: string;
  isReply: boolean;
}

/**
 * @summary Envia un correu electrònic i, si és una resposta, crea una oportunitat de negoci.
 * @param {SendEmailParams} params - Dades necessàries per a l'enviament.
 * @returns {Promise<ActionResult>} Un objecte indicant l'èxit.
 */
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
    // PAS 1: Cridem a una Edge Function de Supabase ('send-email') que s'encarregarà de la lògica d'enviament.
    // Això és una bona pràctica per encapsular la lògica complexa o que requereix claus secretes.
    const { error: emailError } = await supabase.functions.invoke("send-email", {
      body: { contactId, subject, htmlBody },
    });
    if (emailError) throw new Error(emailError.message);

    // PAS 2: Si el correu és una resposta a un tiquet ('isReply'), implementem una lògica de negoci addicional.
    if (isReply) {
      // Comprovem si ja existeix una oportunitat per a aquest contacte.
      const { data: existingOpportunities } = await supabase
        .from("opportunities")
        .select("id")
        .eq("contact_id", contactId)
        .limit(1)
        .returns<Opportunity[]>();

      // Si no existeix cap oportunitat, en creem una de nova automàticament.
      if (!existingOpportunities || existingOpportunities.length === 0) {
        await supabase.from("opportunities").insert({
          user_id: user.id,
          contact_id: contactId,
          name: `Oportunitat: ${subject}`,
          stage_name: "Contactat", // Estat inicial de l'oportunitat.
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
