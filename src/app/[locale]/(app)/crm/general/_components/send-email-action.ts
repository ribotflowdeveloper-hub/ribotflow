"use server";

import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la nostra funció de validació

export async function sendEmailWithGmailAction(
  contactId: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; message: string }> {
  
  // ✅ 2. Reutilitzem la validació de sessió centralitzada.
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session; // Obtenim el client de Supabase ja validat.

  // ✅ 3. La resta de la lògica es manté igual, però ara és més neta.
  const { error } = await supabase.functions.invoke('send-email', {
    body: { contactId, subject, htmlBody },
  });

  if (error) {
    console.error("Error en invocar la funció 'send-email':", error);
    return { success: false, message: `Error en enviar el correu: ${error.message}` };
  }

  return { success: true, message: "El correu s'ha enviat correctament." };
}