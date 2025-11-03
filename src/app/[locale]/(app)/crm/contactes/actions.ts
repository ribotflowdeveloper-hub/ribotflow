"use server";

import { revalidatePath } from "next/cache";
import type { Contact } from "@/types/crm/contacts"; // Assegurem que s'importa el tipus Contact correctament
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/index";
// ✅ 1. Importem els nostres nous guardians de seguretat i límits
import {
  PERMISSIONS,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";
import { checkUsageLimit } from "@/lib/subscription/subscription";
import { type Database } from "@/types/supabase";
// ----------------------------------------------------
// ACCIONS DE LLISTA/FETCHING
// ----------------------------------------------------
type ContactRow = Database['public']['Tables']['contacts']['Row']
/**
 * Obté tots els contactes/proveïdors de l'equip actiu.
 * Aquesta funció és cridada per Server Components com ExpenseDetailData.tsx.
 * * * ✅ El Per Què: Optimitza la càrrega de llistes per a selectors (dropdowns).
 */
export async function fetchContacts(): Promise<Contact[]> {
  // ✅ 2. Canviem a validateSessionAndPermission per assegurar que només
  // els usuaris amb permís per VEURE contactes puguin fer-ho.
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_CONTACTS);

  // Si la sessió falla (usuari no logat o sense equip), no podem fer el fetch.
  if ("error" in session) {
    // En lloc de llençar un error, que podria trencar la pàgina de detall,
    // retornem un array buit si la llista de contactes no és essencial per a l'autenticació.
    // Tot i així, en una aplicació on la despesa depèn de l'usuari, el redirect ja s'hauria fet.
    console.error(
      "No es pot carregar la sessió per obtenir els contactes:",
      session.error.message,
    );
    return [];
  }

  const { supabase } = session;

  // La clau és utilitzar un SELECT lleuger.
  // La RLS filtrarà automàticament per team_id.
  const { data, error } = await supabase
    .from("contacts")
    .select(`
            id,
            nom,
            nif,
            email,
            telefon,
            estat,
            empresa,
            valor
        `)
    .order("nom", { ascending: true }); // Ordenació alfabètica per defecte

  if (error) {
    console.error("Error en carregar els contactes:", error);
    // Llançar un error actiu per al error.tsx (gestió d'errors al servidor)
    throw new Error("No s'han pogut carregar els contactes.");
  }

  // ✅ Bona Pràctica: Casting segur al tipus definit (Contact[])
  return (data as Contact[]) || [];
}

// ----------------------------------------------------
// ACCIONS DE MUTACIÓ
// ----------------------------------------------------

export async function createContactAction(
  formData: FormData,
): Promise<{ data: Contact | null; error: { message: string } | null }> {
  // ✅ 3. Validació de PERMÍS (Auth + Context)
  // Assegurem que l'usuari pot 'gestionar' contactes.
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_CONTACTS,
  );

  if ("error" in validation) {
    return { data: null, error: validation.error };
  }
  const { supabase, user, activeTeamId, context } = validation;

  // ✅ 4. Validació de LÍMIT (Count)
  // Comprovem el límit 'maxContacts' usant el planId del context.
  const limitCheck = await checkUsageLimit(
    supabase,
    activeTeamId,
    "maxContacts", // La clau del límit que hem definit
    context.planId, // El planId obtingut del nostre RPC
  );

  if (!limitCheck.allowed) {
    return {
      data: null,
      error: {
        message: limitCheck.error ||
          "Has assolit el límit de contactes del teu pla.",
      },
    };
  }
  const nom = formData.get("nom") as string;
  const email = formData.get("email") as string;

  if (!nom || !email) {
    return {
      data: null,
      error: { message: "El nom i l'email són obligatoris." },
    };
  }

  const dataToInsert = {
    nom,
    email,
    empresa: formData.get("empresa") as string,
    telefon: formData.get("telefon") as string,
    estat: formData.get("estat") as "Lead" | "Proveidor" | "Client",
    valor: parseFloat(formData.get("valor") as string) || 0,
    team_id: activeTeamId,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error en crear el contacte:", error);
    return { data: null, error: { message: error.message } };
  }

  revalidatePath("/crm/contactes");
  return { data, error: null };
}

/**
 * ✅ NOVA FUNCIÓ
 * Obté tots els contactes (persones) associats a un proveïdor (empresa) específic.
 * S'utilitzarà a la pàgina de detall del proveïdor per a la Visió 360.
 */
export async function fetchContactsForSupplier(supplierId: string) {
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in fetchContactsForSupplier:", session.error);
    return [];
  }
  const { supabase, activeTeamId } = session;

  const { data, error } = await supabase
    .from("contacts")
    .select("id, nom, job_title, email, telefon")
    .eq("supplier_id", supplierId) // El filtre clau
    .eq("team_id", activeTeamId)
    .order("nom", { ascending: true });

  if (error) {
    console.error("Error fetching contacts for supplier:", error.message);
    return [];
  }

  return data;
}

// Tipus per a la resposta d'aquesta funció (opcional però recomanat)
export type ContactForSupplier = Awaited<
  ReturnType<typeof fetchContactsForSupplier>
>[0];

/**
 * Cerca contactes que NO estan vinculats a cap proveïdor.
 */
export async function searchContactsForLinking(
  searchTerm: string,
): Promise<Pick<Contact, "id" | "nom" | "email">[]> {
  const session = await validateUserSession();
  if ("error" in session) return [];
  const { supabase, activeTeamId } = session;

  let query = supabase
    .from("contacts")
    .select("id, nom, email")
    .eq("team_id", activeTeamId)
    .is("supplier_id", null) // ✅ Clau: Només contactes no vinculats
    .limit(10);

  if (searchTerm) {
    query = query.ilike("nom", `%${searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error searching contacts for linking:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Vincula un contacte existent a un proveïdor.
 * ✅ MODIFICAT: Ara també actualitza el nom de l'empresa.
 */
export async function linkContactToSupplier(
  contactId: string,
  supplierId: string,
): Promise<ActionResult<Contact>> {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_CONTACTS,
  );

  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  
  const { supabase, activeTeamId } = session;

  // 1. ✅ NOU: Obtenim el nom del proveïdor
  const { data: supplierData, error: supplierError } = await supabase
    .from("suppliers")
    .select("nom")
    .eq("id", supplierId)
    .eq("team_id", activeTeamId)
    .single();

  if (supplierError || !supplierData) {
    console.error("Error fetching supplier name:", supplierError);
    return { success: false, message: "No s'ha pogut trobar el proveïdor." };
  }

  const supplierName = supplierData.nom;

  // 2. Actualitzem el contacte
  const { data, error } = await supabase
    .from("contacts")
    .update({
      supplier_id: supplierId,
      estat: "P",
      empresa: supplierName, // ✅ NOU: Assignem el nom del proveïdor a l'empresa
    })
    .eq("id", contactId)
    .eq("team_id", activeTeamId) // Seguretat
    .select()
    .single();

  if (error) {
    console.error("Error linking contact:", error);
    return {
      success: false,
      message: `Error en vincular el contacte: ${error.message}`,
    };
  }

  revalidatePath(`/finances/suppliers/${supplierId}`);
  revalidatePath(`/crm/contactes/${contactId}`);

  return {
    success: true,
    message: "Contacte vinculat.",
    data: data as Contact,
  };
}

/**
 * ✅ NOU: Desvincula un contacte d'un proveïdor.
 * (No l'esborra, només elimina l'associació)
 */
export async function unlinkContactFromSupplier(
  contactId: string,
  supplierId: string, // Per revalidar
): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  // Revertim l'estat a 'Lead' (o el que consideris per defecte)
  // i posem 'supplier_id' i 'empresa' a null.
  const { error } = await supabase
    .from("contacts")
    .update({
      supplier_id: null,
      estat: "Lead", // O 'Prospecte', o el teu estat per defecte
      empresa: null,
    })
    .eq("id", contactId)
    .eq("team_id", activeTeamId); // Seguretat

  if (error) {
    console.error("Error unlinking contact:", error);
    return {
      success: false,
      message: `Error en desvincular el contacte: ${error.message}`,
    };
  }

  // Revalidem les pàgines afectades
  revalidatePath(`/finances/suppliers/${supplierId}`);
  revalidatePath(`/crm/contactes/${contactId}`);

  return { success: true, message: "Contacte desvinculat." };
}
/**
 * Obté una llista de tots els contactes d'un equip.
 * Ideal per a selectors, comboboxes, etc.
 */
export async function getTeamContactsList(): Promise<ContactRow[]> {
  const session = await validateUserSession()
  if ('error' in session) {
    return []
  }

  const { supabase, activeTeamId } = session

  // Seleccionem la fila sencera per compatibilitat,
  // tal com fas a InvoiceDetailClient
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('team_id', activeTeamId)
    .order('nom', { ascending: true })

  if (error) {
    console.error('Error fetching contacts list:', error.message)
    return []
  }

  return contacts
}