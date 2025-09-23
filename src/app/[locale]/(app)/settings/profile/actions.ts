// /app/[locale]/settings/profile/actions.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Actualiza los datos PERSONALES del usuario en la tabla 'profiles'.
 */
export async function updateUserProfileAction(formData: FormData) {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado." };

  const profileData = {
    full_name: formData.get('full_name') as string,
    phone: formData.get('phone') as string,
    job_title: formData.get('job_title') as string,
    avatar_url: formData.get('avatar_url') as string,
  };

  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id);

  if (error) return { success: false, message: `Error al actualizar el perfil: ${error.message}` };

  revalidatePath('/settings/profile');
  return { success: true, message: "Perfil personal actualizado." };
}

/**
 * Actualiza los datos DE LA EMPRESA en la tabla 'teams'.
 */
export async function updateTeamAction(formData: FormData) {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado." };

  const teamId = formData.get('teamId') as string;
  const teamData = {
    name: formData.get('name') as string,
    tax_id: formData.get('tax_id') as string,
    address: formData.get('address') as string,
    phone: formData.get('company_phone') as string,
    email: formData.get('company_email') as string,
    website: formData.get('website') as string,
    summary: formData.get('summary') as string,
    sector: formData.get('sector') as string,
    logo_url: formData.get('logo_url') as string,
  };

  // Comprobación de seguridad: nos aseguramos de que el usuario es el propietario del equipo
  const { data: team, error: ownerError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('owner_id', user.id)
    .single();

  if (ownerError || !team) {
    return { success: false, message: "No tienes permisos para editar este equipo." };
  }

  const { error } = await supabase
    .from('teams')
    .update(teamData)
    .eq('id', teamId);

  if (error) return { success: false, message: `Error al actualizar la empresa: ${error.message}` };

  revalidatePath('/settings/profile');
  return { success: true, message: "Datos de la empresa actualizados." };
}