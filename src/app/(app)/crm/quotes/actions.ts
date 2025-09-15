/**
 * @file actions.ts (Llista de Pressupostos)
 * @summary Aquest fitxer conté les Server Actions per a la pàgina de la llista de pressupostos.
 * Actualment, només inclou la lògica per eliminar un pressupost de manera segura des del servidor.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * @summary Elimina un pressupost i tots els seus ítems associats de la base de dades.
 * @param {string} quoteId - L'ID del pressupost que es vol eliminar.
 * @returns {Promise<{ success: boolean; message: string }>} Un objecte indicant l'èxit de l'operació.
 */
export async function deleteQuoteAction(quoteId: string) {
  // Validació bàsica d'entrada.
  if (!quoteId) {
    return { success: false, message: "L'ID del pressupost és invàlid." };
  }
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Usuari no autenticat." };
  }

  // --- Transacció Lògica en Dues Passos ---
  // Per mantenir la integritat de la base de dades, primer eliminem els registres dependents
  // (els ítems del pressupost) i després el registre principal (el pressupost).

  // Pas 1: Esborrar els ítems associats al pressupost.
  // Això és crucial si no tens configurat "ON DELETE CASCADE" a la teva base de dades a nivell de foreign key.
  const { error: itemsError } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', quoteId)
    .eq('user_id', user.id); // Assegurem que només esborrem ítems de l'usuari actual.
    
  if (itemsError) {
    console.error("Error en esborrar els ítems del pressupost:", itemsError);
    return { success: false, message: "No s'han pogut esborrar els detalls del pressupost." };
  }

  // Pas 2: Esborrar el pressupost principal.
  const { error: quoteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', user.id); // Important per seguretat.

  if (quoteError) {
    console.error("Error en esborrar el pressupost:", quoteError);
    return { success: false, message: "No s'ha pogut esborrar el pressupost." };
  }

  // Revalidem la ruta de la llista de pressupostos. Això indica a Next.js que la memòria cau
  // d'aquesta pàgina ha quedat invalidada i que l'ha de tornar a carregar amb dades fresques.
  revalidatePath('/crm/quotes');

  return { success: true, message: "Pressupost esborrat correctament." };
}
