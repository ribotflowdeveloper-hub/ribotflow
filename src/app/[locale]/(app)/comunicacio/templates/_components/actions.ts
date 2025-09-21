/**
 * @file actions.ts (Templates)
 * @summary Aquest fitxer conté les Server Actions per a la gestió de les plantilles d'email.
 * Tota la lògica de crear, actualitzar i eliminar plantilles a la base de dades
 * es troba aquí, garantint que s'executa de manera segura al servidor.
 */

"use server"; // Directiva de Next.js per a les Server Actions.

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type EmailTemplate } from '../page'; // Importem el tipus definit a la pàgina.
import type { PostgrestError } from "@supabase/supabase-js"; // Tipus d'error específic de Supabase.

/**
 * @summary Desa una plantilla d'email, ja sigui creant-ne una de nova o actualitzant-ne una d'existent.
 * @param {Omit<EmailTemplate, ...>} templateData - Les dades de la plantilla a desar.
 * @param {string | null} templateId - L'ID de la plantilla a actualitzar, o 'new'/'null' si és una de nova.
 * @returns {Promise<{ data: EmailTemplate | null; error: PostgrestError | null }>} La plantilla desada o un objecte d'error.
 */
export async function saveTemplateAction(
  templateData: Omit<EmailTemplate, "id" | "created_at" | "user_id">,
  templateId: string | null
): Promise<{ data: EmailTemplate | null; error: PostgrestError | null }> {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Not authenticated" } as PostgrestError };

  // Validació bàsica al servidor.
  if (!templateData.name) {
    return { data: null, error: { message: "El nom de la plantilla és obligatori." } as PostgrestError };
  }
  
  let data: EmailTemplate | null = null;
  let error: PostgrestError | null = null;

  // Lògica per diferenciar entre una actualització (UPDATE) i una creació (INSERT).
  if (templateId && templateId !== 'new') { // Si hi ha un ID vàlid, actualitzem.
    ({ data, error } = await supabase
      .from('email_templates')
      .update(templateData)
      .eq('id', templateId)
      .select()
      .single());
  } else { // Si no, inserim un nou registre.
    ({ data, error } = await supabase
      .from('email_templates')
      .insert({ ...templateData, user_id: user.id })
      .select()
      .single());
  }

  if (error) {
    console.error("Error en desar la plantilla:", error);
    return { data: null, error };
  }

  // Un cop l'operació ha tingut èxit, revalidem la ruta per refrescar la llista de plantilles a la UI.
  revalidatePath('/comunicacio/templates');
  return { data, error: null };
}

/**
 * @summary Elimina una plantilla d'email de la base de dades.
 * @param {string} templateId - L'ID de la plantilla a eliminar.
 * @returns {Promise<{ error: PostgrestError | null }>} Un objecte d'error si l'operació falla.
 */
export async function deleteTemplateAction(
  templateId: string
): Promise<{ error: PostgrestError | null }> {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not authenticated" } as PostgrestError };

  // La clàusula '.match' assegura que només es pot eliminar una plantilla si l'ID i el user_id coincideixen.
  // Això és una capa de seguretat addicional a les RLS (Row Level Security) de Supabase.
  const { error } = await supabase.from('email_templates').delete().match({ id: templateId, user_id: user.id });

  if (error) {
    console.error("Error en eliminar la plantilla:", error);
    return { error };
  }

  revalidatePath('/comunicacio/templates');
  return { error: null };
}
