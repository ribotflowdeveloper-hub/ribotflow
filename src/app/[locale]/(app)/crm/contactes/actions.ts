"use server";

import { revalidatePath } from "next/cache";
import {
  PERMISSIONS,
  validateActionAndUsage,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";
import { validateUserSession } from "@/lib/supabase/session";
import * as contactService from "@/lib/services/crm/contacts/contacts.service";
import type { Contact } from "@/types/db"; // 🟢 Eliminat ContactWithOpportunities
import type { ActionResult } from "@/types/shared/actionResult";

// ----------------------------------------------------
// ACCIONS DE LECTURA
// ----------------------------------------------------

export async function fetchContactsAction(): Promise<
  ActionResult<Partial<Contact>[]>
> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_CONTACTS);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }

  try {
    const data = await contactService.getPaginatedContacts(session.supabase, {
      teamId: session.activeTeamId,
      page: 1,
    });
    return { success: true, data: data.contacts };
  } catch (error) {
    // 🟢 Utilitzem l'error fent log per evitar "unused var"
    console.error("Error fetching contacts:", error);
    return { success: false, message: "Error carregant contactes." };
  }
}

export async function searchContactsForLinkingAction(
  query: string,
): Promise<Pick<Contact, "id" | "nom" | "email">[]> {
  const session = await validateUserSession();
  if ("error" in session) return [];

  return await contactService.searchContactsForLinking(
    session.supabase,
    session.activeTeamId,
    query,
  );
}

// ----------------------------------------------------
// ACCIONS D'ESCRIPTURA
// ----------------------------------------------------

export async function createContactAction(
  formData: FormData,
): Promise<ActionResult<Contact>> {
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_CONTACTS,
    "maxContacts",
  );

  if ("error" in validation) {
    return { success: false, message: validation.error.message };
  }

  const { supabase, user, activeTeamId } = validation;

  try {
    const newContact = await contactService.createContact(
      supabase,
      formData,
      user.id,
      activeTeamId,
    );

    revalidatePath("/crm/contactes");
    return {
      success: true,
      message: "Contacte creat correctament.",
      data: newContact,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message: msg };
  }
}

export async function linkContactToSupplierAction(
  contactId: string,
  supplierId: string,
): Promise<ActionResult<Contact>> {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_CONTACTS,
  );
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }

  try {
    const data = await contactService.linkContactToSupplier(
      session.supabase,
      Number(contactId),
      supplierId,
      session.activeTeamId,
    );

    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/crm/contactes/${contactId}`);
    return { success: true, message: "Contacte vinculat correctament.", data };
  } catch (error) {
    console.error("Error linking contact:", error); // 🟢 Log per utilitzar la variable
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error vinculant contacte",
    };
  }
}

export async function unlinkContactFromSupplierAction(
  contactId: string,
  supplierId: string,
): Promise<ActionResult<void>> {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_CONTACTS,
  );
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }

  try {
    await contactService.unlinkContactFromSupplier(
      session.supabase,
      Number(contactId),
      session.activeTeamId,
    );

    revalidatePath(`/finances/suppliers/${supplierId}`);
    revalidatePath(`/crm/contactes/${contactId}`);
    return { success: true, message: "Contacte desvinculat." };
  } catch (error) {
    console.error("Error unlinking contact:", error); // 🟢 Log per utilitzar la variable
    return { success: false, message: "Error desvinculant contacte." };
  }
}