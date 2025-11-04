// src/app/[locale]/(app)/settings/profile/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
// ❌ Eliminem Zod i 'hasPermission', ja que ara viuen al servei.

// ✅ 1. Importem el NOU servei i els seus tipus
import * as profileService from '@/lib/services/settings/profile/profile.service';
import type { FormState } from '@/lib/services/settings/profile/profile.service';


/**
 * Actualitza les dades PERSONALS de l'usuari.
 */
export async function updateUserProfileAction(formData: FormData): Promise<FormState> {
  // 1. Validació de sessió
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user } = session;

  // 2. Crida al servei
  const result = await profileService.updateUserProfile(supabase, user, formData);

  // 3. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/settings/profile');
  }

  return result;
}

// ❌ Eliminem el 'TeamSchema' d'aquí.

/**
 * Actualitza les dades DE L'EMPRESA de l'equip actiu.
 */
export async function updateTeamAction(formData: FormData): Promise<FormState> {
  // 1. Validació de sessió
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  // 2. Crida al servei
  // Tota la lògica de permisos, Zod i BBDD està al servei.
  const result = await profileService.updateTeamProfile(supabase, user, activeTeamId, formData);

  // 3. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/settings/profile');
  }

  return result;
}