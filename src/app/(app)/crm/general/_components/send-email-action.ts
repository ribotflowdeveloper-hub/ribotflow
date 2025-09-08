"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Aquesta Server Action fa de pont segur cap a la teva Edge Function
export async function sendEmailWithGmailAction(
  contactId: string, 
  subject: string, 
  htmlBody: string
): Promise<{ success: boolean; message: string }> {
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Obtenim la sessió per assegurar-nos que l'usuari està autenticat
  // El token de sessió s'inclourà automàticament a la crida a la funció
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, message: "Usuari no autenticat." };
  }

  // Cridem la teva Edge Function 'send-email'
  const { error } = await supabase.functions.invoke('send-email', {
    body: { contactId, subject, htmlBody },
  });

  if (error) {
    console.error("Error en invocar la funció 'send-email':", error);
    return { success: false, message: `Error en enviar el correu: ${error.message}` };
  }

  return { success: true, message: "El correu s'ha enviat correctament." };
}