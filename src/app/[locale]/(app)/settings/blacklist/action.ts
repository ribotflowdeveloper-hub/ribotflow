// src/app/[locale]/(app)/settings/blacklist/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";

// ✅ 1. Importem el NOU servei
import * as blacklistService from '@/lib/services/settings/blacklist/blacklist.service';

// ✅ 2. Importem els tipus NOMÉS PER A ÚS INTERN
import type { FormState } from '@/lib/services/settings/blacklist/blacklist.service';

/**
 * Afegeix una nova regla a la blacklist per a l'equip actiu.
 */
export async function addRuleAction(formData: FormData): Promise<FormState> {
  // 1. Validació de sessió
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // 2. Crida al servei
  const result = await blacklistService.addRule(supabase, user, activeTeamId, formData);

  // 3. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/settings/blacklist');
  }

  return result;
}

/**
 * Elimina una regla de la blacklist.
 */
export async function deleteRuleAction(id: string): Promise<FormState> {
  // 1. Validació de sessió
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // 2. Crida al servei
  const result = await blacklistService.deleteRule(supabase, user, activeTeamId, id);

  // 3. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/settings/blacklist');
  }

  return result;
}