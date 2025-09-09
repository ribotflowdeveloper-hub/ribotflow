"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type EmailTemplate } from '../page'; // Importarem el tipus des de la pàgina
import type { PostgrestError } from "@supabase/supabase-js";

// Acció per desar (crear o actualitzar) una plantilla
export async function saveTemplateAction(
  templateData: Omit<EmailTemplate, "id" | "created_at" | "user_id">,
  templateId: string | null
): Promise<{ data: EmailTemplate | null; error: PostgrestError | null }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: {
    message: "Not authenticated",
    details: "",
    hint: "",
    code: "",
    name: ""
  } };

  if (!templateData.name) {
    return { data: null, error: {
      message: "El nom de la plantilla és obligatori.",
      details: "",
      hint: "",
      code: "",
      name: ""
    } };
  }
  
  let data: EmailTemplate | null = null;
  let error: PostgrestError | null = null; // Tipus correcte

  if (templateId && templateId !== 'new') { // Update
    ({ data, error } = await supabase
      .from('email_templates')
      .update(templateData)
      .eq('id', templateId)
      .select()
      .single());
  } else { // Insert
    ({ data, error } = await supabase
      .from('email_templates')
      .insert({ ...templateData, user_id: user.id })
      .select()
      .single());
  }

  if (error) {
    console.error("Error saving template:", error);
    return { data: null, error };
  }

  revalidatePath('/comunicacio/templates');
  return { data, error: null };
}

// Acció per eliminar una plantilla
export async function deleteTemplateAction(
  templateId: string
): Promise<{ error: PostgrestError | null }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: {
    message: "Not authenticated",
    details: "",
    hint: "",
    code: "",
    name: ""
  } };

  const { error } = await supabase.from('email_templates').delete().match({ id: templateId, user_id: user.id });

  if (error) {
    console.error("Error deleting template:", error);
    return { error };
  }

  revalidatePath('/comunicacio/templates');
  return { error: null };
}