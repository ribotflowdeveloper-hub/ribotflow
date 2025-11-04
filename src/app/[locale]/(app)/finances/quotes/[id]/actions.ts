// /app/[locale]/(app)/finances/quotes/[id]/actions.ts (FITXER CORREGIT)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/index";

// ✅ NOU: Importem els serveis
import {
  saveQuote,
  deleteQuote,
  createProduct,
  sendQuote,
  updateTeamProfile,
} from "@/lib/services/finances/quotes/quote-editor.service"; // Assegura't que la ruta al servei és correcta

// ✅ NOU: Importem els tipus NOMÉS PER A ÚS INTERN (ja no s'exporten)
import { type QuotePayload, type Product, type Team } from "@/types/finances/quotes";

// ❌ LÍNIA ELIMINADA QUE CAUSAVA L'ERROR:
// export * from "@/types/finances/quotes";

/**
 * ACCIÓ: Desa (crea o actualitza) un pressupost.
 */
export async function saveQuoteAction(
  quoteData: QuotePayload,
): Promise<ActionResult<number>> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await saveQuote(supabase, quoteData, activeTeamId);

  if (result.success && result.data) {
    const finalQuoteId = result.data;
    revalidatePath("/finances/quotes"); 
    revalidatePath(`/finances/quotes/${finalQuoteId}`); 
  }
  
  return result;
}

/**
 * ACCIÓ: Esborra un pressupost.
 */
export async function deleteQuoteAction(quoteId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase } = session;

  const { error } = await deleteQuote(supabase, quoteId);

  if (error) {
    return { success: false, message: error.message || "Error en eliminar el pressupost." };
  }

  revalidatePath("/finances/quotes"); 
  return { success: true, message: "Pressupost eliminat." };
}

/**
 * ACCIÓ: Crea un nou producte.
 */
export async function createProductAction(newProduct: {
  name: string;
  price: number;
}): Promise<ActionResult<Product>> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const result = await createProduct(supabase, newProduct, user.id, activeTeamId);

  if (result.success) {
    revalidatePath(`/finances/quotes`, "layout"); 
  }
  
  return result;
}


/**
 * ACCIÓ: Envia el pressupost per email.
 */
export async function sendQuoteAction(quoteId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };

  // ✅ CORRECCIÓ CLAU: Ara passem l'objecte 'user' complet
  const { supabase, user } = session;

  // ✅ El nostre servei 'sendQuote' ara necessita 'supabase', 'user', i 'quoteId'
  const result = await sendQuote(supabase, user, quoteId);

  if (result.success) {
    revalidatePath(`/finances/quotes/${quoteId}`);
  }

  return result;
}

/**
 * ACCIÓ: Actualitza el perfil de l'equip.
 */
export async function updateTeamProfileAction(
  teamData: Partial<Team>,
): Promise<ActionResult<Team>> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  const result = await updateTeamProfile(supabase, teamData, activeTeamId);
  
  if (result.success) {
    revalidatePath(`/finances/quotes/[id]`, "page"); 
  }
  
  return result;
}