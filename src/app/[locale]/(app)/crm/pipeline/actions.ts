/**
 * @file actions.ts (Pipeline)
 * @summary Aquest fitxer conté les Server Actions per al mòdul del Pipeline de Vendes.
 * Les funcions aquí s'executen de manera segura al servidor i són responsables de
 * tota la interacció amb la base de dades, com desar, actualitzar i moure oportunitats.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * @summary Desa una oportunitat, ja sigui creant-ne una de nova o actualitzant-ne una d'existent.
 * @param {FormData} formData - Les dades del formulari de creació/edició de l'oportunitat.
 * @returns {Promise<{ success: boolean } | { error: { message: string } }>} Un objecte indicant l'èxit o un error.
 */
export async function saveOpportunityAction(formData: FormData) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
  
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };
  
    // Convertim el FormData en un objecte pla per a un maneig més fàcil.
    const rawData = Object.fromEntries(formData.entries());
  
    // Preparem les dades per a la base de dades, fent les conversions de tipus necessàries.
    const dataToSave = {
      name: rawData.name as string,
      description: rawData.description as string,
      contact_id: rawData.contact_id as string,
      stage_name: rawData.stage_name as string,
      value: rawData.value ? parseFloat(rawData.value as string) : null,
      close_date: rawData.close_date ? new Date(rawData.close_date as string).toISOString() : null,
      user_id: user.id,
    };
  
    try {
        // Lògica d'Upsert: si el formulari conté un ID, fem un UPDATE; si no, fem un INSERT.
      const { error } = await (rawData.id
        ? supabase.from("opportunities").update(dataToSave).eq("id", rawData.id)
        : supabase.from("opportunities").insert(dataToSave));
      if (error) throw error;
  
      // Revalidem la ruta del pipeline per assegurar que la UI es refresqui amb les noves dades.
      revalidatePath("/crm/pipeline");
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconegut";
      return { error: { message } };
    }
  }
  
/**
 * @summary Actualitza l'etapa (stage) d'una oportunitat. Aquesta és l'acció clau per al drag-and-drop.
 * @param {string} opportunityId - L'ID de l'oportunitat que s'ha mogut.
 * @param {string} newStage - El nom de la nova etapa on s'ha deixat anar l'oportunitat.
 * @returns {Promise<{ success: boolean } | { error: { message: string } }>} Un objecte indicant l'èxit o un error.
 */
  export async function updateOpportunityStageAction(
    opportunityId: string,
    newStage: string
  ) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
  
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };
  
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({ stage_name: newStage })
        .eq("id", opportunityId)
        .eq("user_id", user.id); // Important: assegurem que l'usuari només pot modificar les seves pròpies oportunitats.
  
      if (error) throw error;
  
      // Revalidem la ruta per reflectir el canvi a totes les vistes del pipeline.
      revalidatePath("/crm/pipeline");
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconegut";
      return { error: { message } };
    }
  }
