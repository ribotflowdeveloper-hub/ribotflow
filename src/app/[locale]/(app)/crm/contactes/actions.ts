"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/index";
import {
  PERMISSIONS,
  validateSessionAndPermission,
  validateActionAndUsage, // ✅ 1. Importem el nostre guardià 3-en-1
} from "@/lib/permissions/permissions";
// ❌ 2. Ja no necessitem 'checkUsageLimit' aquí
// import { checkUsageLimit } from "@/lib/subscription/subscription";

import type { Contact } from "@/types/db"; 
import * as contactService from "@/lib/services/crm/contacts/contacts.service";

// ----------------------------------------------------
// ACCIONS DE LLISTA/FETCHING
// ----------------------------------------------------

/**
 * ACCIÓ: Obté tots els contactes/proveïdors de l'equip actiu.
 */
export async function fetchContacts(): Promise<Partial<Contact>[]> {
  // Correcte: Aquesta acció només necessita permís de VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_CONTACTS);

  if ("error" in session) {
    console.error("No es pot carregar la sessió per obtenir els contactes:", session.error.message);
    return [];
  }

  const { supabase, activeTeamId } = session;

  try {
    return await contactService.fetchContactsList(supabase, activeTeamId);
  } catch (error) {
    console.error("Error en carregar els contactes (action):", error);
    throw new Error("No s'han pogut carregar els contactes.");
  }
}

// ----------------------------------------------------
// ACCIONS DE MUTACIÓ
// ----------------------------------------------------

export async function createContactAction(
  formData: FormData,
): Promise<{ data: Contact | null; error: { message: string } | null }> {
  
  // ✅ 3. VALIDACIÓ 3-EN-1 (Sessió + Rol + Límit)
  // Aquest guardià automàticament:
  // 1. Valida la sessió de l'usuari.
  // 2. Comprova que el rol tingui 'PERMISSIONS.MANAGE_CONTACTS'.
  // 3. Comprova 'getUsageLimitStatus('maxContacts')' i falla si no és 'allowed'.
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_CONTACTS,
    'maxContacts' // El límit del pla que ha de comprovar
  );

  // Si la validació falla (permís o límit), retorna l'error
  if ("error" in validation) {
    return { data: null, error: validation.error };
  }
  
  // Si la validació passa, tenim tot el que necessitem
  const { supabase, user, activeTeamId } = validation;

  try {
    // 4. Cridem al servei
    const data = await contactService.createContact(
      supabase,
      formData,
      user.id,
      activeTeamId
    );
    
    // 5. Efecte secundari
    revalidatePath("/crm/contactes");
    return { data, error: null };

  } catch (error: unknown) {
    // 6. Gestió d'errors
    const message = (error as Error).message;
    console.error("Error en crear el contacte (action):", message);
    return { data: null, error: { message } };
  }
}

/**
 * ACCIÓ: Obté contactes per a un proveïdor (Visió 360).
 */
export async function fetchContactsForSupplier(supplierId: string) {
  // Correcte: Aquesta acció només valida la sessió (és de lectura)
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in fetchContactsForSupplier:", session.error);
    return [];
  }
  const { supabase, activeTeamId } = session;

  try {
    return await contactService.fetchContactsForSupplier(supabase, supplierId, activeTeamId);
  } catch (error) {
    console.error("Error fetching contacts for supplier (action):", (error as Error).message);
    return [];
  }
}

/**
 * ACCIÓ: Cerca contactes que NO estan vinculats.
 */
export async function searchContactsForLinking(
  searchTerm: string,
): Promise<Pick<Contact, "id" | "nom" | "email">[]> {
  // Correcte: Només valida sessió
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  return await contactService.searchContactsForLinking(supabase, activeTeamId, searchTerm);
}

/**
 * ACCIÓ: Vincula un contacte existent a un proveïdor.
 */
export async function linkContactToSupplier(
  contactId: string,
  supplierId: string,
): Promise<ActionResult<Contact>> {
  // Correcte: Aquesta acció no crea contactes, només els modifica.
  // Només necessita el permís de ROL.
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_CONTACTS);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  const contactIdNum = Number(contactId);
  if (isNaN(contactIdNum)) {
    return { success: false, message: "L'ID del contacte no és vàlid." };
  }

  try {
    const data = await contactService.linkContactToSupplier(
      supabase,
      contactIdNum,
      supplierId,
      activeTeamId
    );
    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/crm/contactes/${contactId}`);
    return { success: true, message: "Contacte vinculat.", data: data as Contact };
  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error linking contact (action):", message);
    return { success: false, message: `Error en vincular el contacte: ${message}` };
  }
}

/**
 * ACCIÓ: Desvincula un contacte d'un proveïdor.
 */
export async function unlinkContactFromSupplier(
  contactId: string, 
  supplierId: string,
): Promise<ActionResult> {
  // Correcte: Només necessita el permís de ROL.
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_CONTACTS);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  const contactIdNum = Number(contactId);
  if (isNaN(contactIdNum)) {
    return { success: false, message: "L'ID del contacte no és vàlid." };
  }

  try {
    await contactService.unlinkContactFromSupplier(supabase, contactIdNum, activeTeamId);
    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/crm/contactes/${contactId}`);
    return { success: true, message: "Contacte desvinculat." };
  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error unlinking contact (action):", error);
    return { success: false, message: `Error en desvincular el contacte: ${message}` };
  }
}

/**
 * ACCIÓ: Obté una llista de tots els contactes d'un equip.
 */
export async function getTeamContactsList(): Promise<Contact[]> {
  // Correcte: Només valida sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return []
  }
  const { supabase, activeTeamId } = session
  const contacts = await contactService.getAllContacts(supabase, activeTeamId);
  return contacts as Contact[];
}