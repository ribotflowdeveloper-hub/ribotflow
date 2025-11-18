"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult } from "@/types/shared/index";

// 1. Importem els guardians de seguretat
import {
  PERMISSIONS,
  validateSessionAndPermission,
  validateActionAndUsage,
} from "@/lib/permissions/permissions";

// ✅ 2. CANVI CLAU: Importem des de la nova estructura modular
// Assegura't que la ruta apunti a on has creat la carpeta 'services/quotes'
import {
  saveQuote,
  deleteQuote,
  createProduct,
  sendQuote,
  updateTeamProfile,
} from "@/lib/services/finances/quotes/index"; 

// Importem els tipus
import { type QuotePayload, type Product, type Team } from "@/types/finances/quotes";

/**
 * ACCIÓ: Desa (crea o actualitza) un pressupost.
 */
export async function saveQuoteAction(
  quoteData: QuotePayload,
): Promise<ActionResult<number>> {
  const isCreatingNew = quoteData.id === 'new';

  // 3. Validació de seguretat i límits
  let validation;
  if (isCreatingNew) {
    // Creació: Comprovem permís + Límits del pla (maxQuotesPerMonth)
    validation = await validateActionAndUsage(
      PERMISSIONS.MANAGE_QUOTES,
      'maxQuotesPerMonth'
    );
  } else {
    // Edició: Només comprovem permís
    validation = await validateSessionAndPermission(
      PERMISSIONS.MANAGE_QUOTES
    );
  }

  if ("error" in validation) {
    return { success: false, message: validation.error.message };
  }

  const { supabase, activeTeamId } = validation;

  // 4. Crida al servei (modularitzat)
  const result = await saveQuote(supabase, quoteData, activeTeamId);

  if (result.success && result.data) {
    const finalQuoteId = result.data;
    // Revalidem les rutes afectades
    revalidatePath("/finances/quotes"); 
    revalidatePath(`/finances/quotes/${finalQuoteId}`); 
  }
  
  return result;
}

/**
 * ACCIÓ: Esborra un pressupost.
 */
export async function deleteQuoteAction(quoteId: number): Promise<ActionResult> {
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_QUOTES);
  if ("error" in validation) return { success: false, message: validation.error.message };
  
  const { supabase } = validation;

  const { error } = await deleteQuote(supabase, quoteId);

  if (error) {
    return { success: false, message: error.message || "Error en eliminar el pressupost." };
  }

  revalidatePath("/finances/quotes"); 
  return { success: true, message: "Pressupost eliminat." };
}

/**
 * ACCIÓ: Crea un nou producte ràpidament.
 */
export async function createProductAction(newProduct: {
  name: string;
  price: number;
}): Promise<ActionResult<Product>> {
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_PRODUCTS,
    'maxProducts'
  );

  if ("error" in validation) return { success: false, message: validation.error.message };

  const { supabase, user, activeTeamId } = validation;

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
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_QUOTES);
  if ("error" in validation) return { success: false, message: validation.error.message };

  const { supabase, user } = validation;

  // La lògica complexa (PDF, Gmail, CRM) ara està encapsulada al servei 'sender.ts'
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
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_PROFILE);
  if ("error" in validation) return { success: false, message: validation.error.message };

  const { supabase, activeTeamId } = validation;

  const result = await updateTeamProfile(supabase, teamData, activeTeamId);
  
  if (result.success) {
    revalidatePath(`/finances/quotes/[id]`, "page"); 
  }
  
  return result;
}