// /app/[locale]/(app)/finances/quotes/[id]/actions.ts (FITXER COMPLET I REFORÇAT)
"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult } from "@/types/shared/index";

// ✅ 1. Importem ELS GUARDIANS de permís i límit
import {
  PERMISSIONS,
  validateSessionAndPermission,
  validateActionAndUsage,
} from "@/lib/permissions/permissions";

// Importem els serveis
import {
  saveQuote,
  deleteQuote,
  createProduct,
  sendQuote,
  updateTeamProfile,
} from "@/lib/services/finances/quotes/quote-editor.service"; // Assegura't que la ruta al servei és correcta

// Importem els tipus
import { type QuotePayload, type Product, type Team } from "@/types/finances/quotes";

/**
 * ACCIÓ: Desa (crea o actualitza) un pressupost.
 * AQUESTA ÉS L'ACCIÓ CLAU QUE ESTAVA FALLANT.
 */
export async function saveQuoteAction(
  quoteData: QuotePayload,
): Promise<ActionResult<number>> {

  let validation;
  const isCreatingNew = quoteData.id === 'new';

  // ✅ 2. Triem el guardià correcte
  if (isCreatingNew) {
    // --- ÉS UNA CREACIÓ ---
    // Validem Sessió + Permís de Rol + Límit de Pla
    validation = await validateActionAndUsage(
      PERMISSIONS.MANAGE_QUOTES,
      'maxQuotesPerMonth' // <-- El límit que ha de comprovar
    );
  } else {
    // --- ÉS UNA ACTUALITZACIÓ ---
    // Validem només Sessió + Permís de Rol
    validation = await validateSessionAndPermission(
      PERMISSIONS.MANAGE_QUOTES
    );
  }

  // 3. Si qualsevol validació falla, retornem l'error
  if ("error" in validation) {
    return { success: false, message: validation.error.message };
  }

  // 4. Si la validació és correcta, continuem
  const { supabase, activeTeamId } = validation;

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
  // ✅ SEGURETAT (RBAC): L'usuari té permís per GESTIONAR pressupostos?
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_QUOTES);
  if ("error" in validation)
    return { success: false, message: validation.error.message };
  
  const { supabase } = validation;

  const { error } = await deleteQuote(supabase, quoteId);

  if (error) {
    return { success: false, message: error.message || "Error en eliminar el pressupost." };
  }

  revalidatePath("/finances/quotes"); 
  return { success: true, message: "Pressupost eliminat." };
}

/**
 * ACCIÓ: Crea un nou producte (des de dins l'editor de pressupostos).
 */
export async function createProductAction(newProduct: {
  name: string;
  price: number;
}): Promise<ActionResult<Product>> {
  
  // ✅ SEGURETAT (RBAC + LÍMIT): Comprovem el permís per gestionar productes
  // i el límit de 'maxProducts'.
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_PRODUCTS, // <-- Permís de Productes
    'maxProducts'                // <-- Límit de Productes
  );

  if ("error" in validation)
    return { success: false, message: validation.error.message };

  const { supabase, user, activeTeamId } = validation;

  const result = await createProduct(supabase, newProduct, user.id, activeTeamId);

  if (result.success) {
    revalidatePath(`/finances/quotes`, "layout"); // Revalidem per a futurs selectors
  }
  
  return result;
}


/**
 * ACCIÓ: Envia el pressupost per email.
 */
export async function sendQuoteAction(quoteId: number): Promise<ActionResult> {
  // ✅ SEGURETAT (RBAC): L'usuari té permís per GESTIONAR pressupostos?
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_QUOTES);
  if ("error" in validation)
    return { success: false, message: validation.error.message };

  const { supabase, user } = validation;

  const result = await sendQuote(supabase, user, quoteId);

  if (result.success) {
    revalidatePath(`/finances/quotes/${quoteId}`);
  }

  return result;
}

/**
 * ACCIÓ: Actualitza el perfil de l'equip (dades de l'emissor).
 */
export async function updateTeamProfileAction(
  teamData: Partial<Team>,
): Promise<ActionResult<Team>> {
  // ✅ SEGURETAT (RBAC): L'usuari té permís per GESTIONAR el perfil de l'equip?
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_PROFILE);
  if ("error" in validation)
    return { success: false, message: validation.error.message };

  const { supabase, activeTeamId } = validation;

  const result = await updateTeamProfile(supabase, teamData, activeTeamId);
  
  if (result.success) {
    revalidatePath(`/finances/quotes/[id]`, "page"); 
  }
  
  return result;
}