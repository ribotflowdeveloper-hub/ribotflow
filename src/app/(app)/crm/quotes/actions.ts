"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function deleteQuoteAction(quoteId: string) {
  if (!quoteId) {
    return { success: false, message: "L'ID del pressupost és invàlid." };
  }
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Usuari no autenticat." };
  }

  // Pas 1: Esborrar els ítems associats al pressupost.
  // Aquesta passa és crucial si no tens "ON DELETE CASCADE" a la teva base de dades.
  const { error: itemsError } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', quoteId)
    .eq('user_id', user.id);
    
  if (itemsError) {
    console.error("Error en esborrar els ítems del pressupost:", itemsError);
    return { success: false, message: "No s'han pogut esborrar els detalls del pressupost." };
  }

  // Pas 2: Esborrar el pressupost principal.
  const { error: quoteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (quoteError) {
    console.error("Error en esborrar el pressupost:", quoteError);
    return { success: false, message: "No s'ha pogut esborrar el pressupost." };
  }

  // Revalidem la ruta per forçar que Next.js torni a carregar les dades a la pàgina.
  revalidatePath('/crm/quotes');

  return { success: true, message: "Pressupost esborrat correctament." };
}
