// src/lib/services/settings/profile.service.ts (FITXER NOU I COMPLET)
"use server";

import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { z } from 'zod';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/permissions/permissions.config';
import { getActiveTeam } from '@/lib/supabase/teams';
// ✅ Importem els tipus de domini
import type { Profile, Team } from "@/types/settings";

// --- Tipus Públics del Servei ---

// Dades que la pàgina necessita
export type ProfilePageData = {
  profile: Profile | null; // ✅ El servei SÍ pot retornar null
  team: Team | null;
  role: Role | null;
};

// Retorn de les accions de formulari
export type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>; 
};

// --- Validació Zod (moguda des de 'actions.ts') ---
const TeamSchema = z.object({
  name: z.string().min(1, "El nom de l'empresa és obligatori."),
  tax_id: z.string().optional().nullable(),
  // ✅ Adrecem els camps del formulari al servei
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  company_phone: z.string().optional().nullable(),
  company_email: z.string().email("L'email de l'empresa no és vàlid.").optional().or(z.literal('')),
  website: z.string().url("L'URL de la web no és vàlida.").optional().or(z.literal('')),
  summary: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
});

// ---
// ⚙️ FUNCIONS DE LECTURA (per a la pàgina)
// ---

/**
 * SERVEI: Obté les dades per a la pàgina de perfil.
 * (Lògica extreta de 'ProfileData.tsx')
 */
export async function getProfilePageData(
  supabase: SupabaseClient<Database>,
  user: User,
  activeTeamId: string | null
): Promise<ProfilePageData> {

  const [profileRes, team, memberRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    activeTeamId ? getActiveTeam(supabase, activeTeamId) : Promise.resolve(null),
    activeTeamId ? supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single() : Promise.resolve({ data: null })
  ]);
  
  const profile = profileRes.data as Profile | null;
  const role = memberRes?.data?.role as Role | null;

  return { profile, team: team as Team | null, role };
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (per a les Server Actions)
// ---

/**
 * SERVEI: Actualitza les dades PERSONALS de l'usuari.
 * (Lògica extreta de 'updateUserProfileAction')
 */
export async function updateUserProfile(
  supabase: SupabaseClient<Database>,
  user: User,
  formData: FormData
): Promise<FormState> {
  
  const profileData = {
    full_name: formData.get('full_name') as string,
    phone: formData.get('phone') as string,
    job_title: formData.get('job_title') as string,
  };

  const { error } = await supabase.from('profiles').update(profileData).eq('id', user.id);

  if (error) return { success: false, message: `Error en actualitzar el perfil: ${error.message}` };
  
  return { success: true, message: "Perfil personal actualitzat." };
}

/**
 * SERVEI: Actualitza les dades DE L'EMPRESA de l'equip actiu.
 * (Lògica extreta de 'updateTeamAction')
 */
export async function updateTeamProfile(
  supabase: SupabaseClient<Database>,
  user: User,
  activeTeamId: string,
  formData: FormData
): Promise<FormState> {
  
  // 1. Comprovació de permisos
  const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
  if (!hasPermission(member?.role as Role, PERMISSIONS.MANAGE_TEAM_PROFILE)) {
    return { success: false, message: "No tens permisos per a editar aquest equip." };
  }

  // 2. Validació de dades amb Zod
  const rawData = Object.fromEntries(formData.entries());
  const validation = TeamSchema.safeParse(rawData);

  if (!validation.success) {
    return { 
      success: false, 
      message: "Hi ha errors en les dades del formulari.",
      errors: validation.error.flatten().fieldErrors
    };
  }
  
  // 3. Transformació de dades (mapeig de camps)
  const { company_email, company_phone, ...teamData } = validation.data;
  const finalTeamData = {
    ...teamData,
    email: company_email,
    phone: company_phone
  };

  // 4. Accés a BBDD
  const { error } = await supabase.from('teams').update(finalTeamData).eq('id', activeTeamId);

  if (error) return { success: false, message: `Error en actualitzar l'empresa: ${error.message}` };
  
  return { success: true, message: "Dades de l'empresa actualitzades." };
}