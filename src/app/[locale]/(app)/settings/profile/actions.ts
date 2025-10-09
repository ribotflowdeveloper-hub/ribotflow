"use server";

import { revalidatePath } from "next/cache";
import { z } from 'zod';
import { validateUserSession } from "@/lib/supabase/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * Actualitza les dades PERSONALS de l'usuari.
 */
export async function updateUserProfileAction(formData: FormData) {
  // ✅ MILLORA: Validació de sessió centralitzada.
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user } = session;

  const profileData = {
    full_name: formData.get('full_name') as string,
    phone: formData.get('phone') as string,
    job_title: formData.get('job_title') as string,
  };

  const { error } = await supabase.from('profiles').update(profileData).eq('id', user.id);

  if (error) return { success: false, message: `Error en actualitzar el perfil: ${error.message}` };

  revalidatePath('/settings/profile');
  return { success: true, message: "Perfil personal actualitzat." };
}


// ✅ MILLORA: Esquema de Zod per a la validació de dades.
const TeamSchema = z.object({
  name: z.string().min(1, "El nom de l'empresa és obligatori."),
  tax_id: z.string().optional(),
  address: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().email("L'email de l'empresa no és vàlid.").optional().or(z.literal('')),
  website: z.string().url("L'URL de la web no és vàlida.").optional().or(z.literal('')),
  summary: z.string().optional(),
  sector: z.string().optional(),
  logo_url: z.string().optional(),
});

/**
 * Actualitza les dades DE L'EMPRESA de l'equip actiu.
 */
export async function updateTeamAction(formData: FormData) {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  // ✅ MILLORA: Permisos centralitzats amb el helper.
  const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
  if (!hasPermission(member?.role, PERMISSIONS.MANAGE_TEAM_PROFILE)) {
    return { success: false, message: "No tens permisos per a editar aquest equip." };
  }

  // ✅ MILLORA: Validació de dades amb Zod.
  const rawData = Object.fromEntries(formData.entries());
  const validation = TeamSchema.safeParse(rawData);

  if (!validation.success) {
    // Podríem retornar els errors específics de Zod per mostrar-los al formulari.
    return { success: false, message: "Hi ha errors en les dades del formulari." };
  }
  
  // Treballem amb les dades validades i netejades per Zod.
  const { company_email, company_phone, ...teamData } = validation.data;
  const finalTeamData = {
    ...teamData,
    email: company_email,
    phone: company_phone
  };

  const { error } = await supabase.from('teams').update(finalTeamData).eq('id', activeTeamId);

  if (error) return { success: false, message: `Error en actualitzar l'empresa: ${error.message}` };

  revalidatePath('/settings/profile');
  return { success: true, message: "Dades de l'empresa actualitzades." };
}