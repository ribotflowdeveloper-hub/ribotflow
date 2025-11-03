// src/app/[locale]/(app)/crm/contactes/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/index";
import {
  PERMISSIONS,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";
import { checkUsageLimit } from "@/lib/subscription/subscription";

// ✅ 1. Importem els tipus de la nostra FONT DE LA VERITAT
import type { Contact } from "@/types/db"; 

// ✅ 2. Importem el nostre servei
import * as contactService from "@/lib/services/crm/contacts/contacts.service";

// ----------------------------------------------------
// ACCIONS DE LLISTA/FETCHING
// ----------------------------------------------------

/**
 * ACCIÓ: Obté tots els contactes/proveïdors de l'equip actiu.
 */
export async function fetchContacts(): Promise<Partial<Contact>[]> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_CONTACTS);

  if ("error" in session) {
    console.error("No es pot carregar la sessió per obtenir els contactes:", session.error.message);
    return [];
  }

  const { supabase, activeTeamId } = session;

  try {
    // ✅ 3. Cridem al servei
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
  // 1. Validació de PERMÍS
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_CONTACTS);
  if ("error" in validation) {
    return { data: null, error: validation.error };
  }
  const { supabase, user, activeTeamId, context } = validation;

  // 2. Validació de LÍMIT
  const limitCheck = await checkUsageLimit(
    supabase,
    activeTeamId,
    "maxContacts",
    context.planId,
  );

  if (!limitCheck.allowed) {
    return {
      data: null,
      error: {
        message: limitCheck.error || "Has assolit el límit de contactes del teu pla.",
      },
    };
  }

  try {
    // 3. Cridem al servei
    const data = await contactService.createContact(
      supabase,
      formData,
      user.id,
      activeTeamId
    );
    
    // 4. Efecte secundari
    revalidatePath("/crm/contactes");
    return { data, error: null };

  } catch (error: unknown) {
    // 5. Gestió d'errors
    const message = (error as Error).message;
    console.error("Error en crear el contacte (action):", message);
    return { data: null, error: { message } };
  }
}

/**
 * ACCIÓ: Obté contactes per a un proveïdor (Visió 360).
 */
export async function fetchContactsForSupplier(supplierId: string) {
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in fetchContactsForSupplier:", session.error);
    return [];
  }
  const { supabase, activeTeamId } = session;

  try {
    // ✅ Cridem al servei
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
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  // Aquesta crida al servei ja retorna [] en cas d'error.
  return await contactService.searchContactsForLinking(supabase, activeTeamId, searchTerm);
}

/**
 * ACCIÓ: Vincula un contacte existent a un proveïdor.
 */
export async function linkContactToSupplier(
  contactId: string, // Rebem string
  supplierId: string,
): Promise<ActionResult<Contact>> {
  // 1. Validació de Permís
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_CONTACTS);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  // ✅ CORRECCIÓ: Convertim l'ID a número abans de passar-lo al servei.
  const contactIdNum = Number(contactId);
  if (isNaN(contactIdNum)) {
      return { success: false, message: "L'ID del contacte no és vàlid." };
  }

  try {
    // 2. Cridem al servei amb el tipus correcte (number)
    const data = await contactService.linkContactToSupplier(
      supabase,
      contactIdNum,
      supplierId,
      activeTeamId
    );

    // 3. Efectes secundaris
    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/crm/contactes/${contactId}`);

    return { success: true, message: "Contacte vinculat.", data: data as Contact };

  } catch (error: unknown) {
    // 4. Gestió d'errors
    const message = (error as Error).message;
    console.error("Error linking contact (action):", message);
    return { success: false, message: `Error en vincular el contacte: ${message}` };
  }
}

/**
 * ACCIÓ: Desvincula un contacte d'un proveïdor.
 */
export async function unlinkContactFromSupplier(
  contactId: string, // Rebem string
  supplierId: string, // Per revalidar
): Promise<ActionResult> {
  // 1. Validació de Permís
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_CONTACTS);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  // ✅ CORRECCIÓ: Convertim l'ID a número
  const contactIdNum = Number(contactId);
  if (isNaN(contactIdNum)) {
      return { success: false, message: "L'ID del contacte no és vàlid." };
  }

  try {
    // 2. Cridem al servei
    await contactService.unlinkContactFromSupplier(supabase, contactIdNum, activeTeamId);

    // 3. Efectes secundaris
    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/crm/contactes/${contactId}`);

    return { success: true, message: "Contacte desvinculat." };

  } catch (error: unknown) {
    // 4. Gestió d'errors
    const message = (error as Error).message;
    console.error("Error unlinking contact (action):", error);
    return { success: false, message: `Error en desvincular el contacte: ${message}` };
  }
}

/**
 * ACCIÓ: Obté una llista de tots els contactes d'un equip.
 */
export async function getTeamContactsList(): Promise<Contact[]> {
  const session = await validateUserSession()
  if ('error' in session) {
    return []
  }
  const { supabase, activeTeamId } = session

  // ✅ Cridem al servei 'getAllContacts'
  const contacts = await contactService.getAllContacts(supabase, activeTeamId);

  return contacts as Contact[];
}