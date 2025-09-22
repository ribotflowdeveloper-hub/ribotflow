"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Aquesta Server Action fa de pont segur cap a la teva Edge Function 'send-email'.
 * La seva principal responsabilitat és verificar l'autenticació de l'usuari
 * abans de permetre la crida a la funció, que podria tenir costos o ser sensible.
 * @param contactId L'ID del contacte a qui s'envia el correu.
 * @param subject L'assumpte del correu.
 * @param htmlBody El contingut del correu en format HTML.
 * @returns Un objecte indicant si l'operació ha tingut èxit i un missatge.
 */
export async function sendEmailWithGmailAction(
  contactId: string, 
  subject: string, 
  htmlBody: string
): Promise<{ success: boolean; message: string }> {
  
  const supabase = createClient(cookies())
;

  // Verificació de seguretat: assegurem que l'usuari està logat.
  // El token de sessió JWT s'inclourà automàticament a la capçalera de la crida a la funció,
  // permetent a l'Edge Function verificar la identitat de l'usuari.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, message: "Usuari no autenticat." };
  }

  // Cridem la nostra Edge Function anomenada 'send-email', passant les dades al 'body'.
  const { error } = await supabase.functions.invoke('send-email', {
    body: { contactId, subject, htmlBody },
  });

  if (error) {
    console.error("Error en invocar la funció 'send-email':", error);
    return { success: false, message: `Error en enviar el correu: ${error.message}` };
  }

  // Si no hi ha error, retornem un missatge d'èxit.
  return { success: true, message: "El correu s'ha enviat correctament." };
}