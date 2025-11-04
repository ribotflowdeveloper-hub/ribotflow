// src/app/[locale]/(app)/settings/permissions/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from '@/lib/supabase/session';

// ✅ 1. Importem el NOU servei
import * as permissionsService from '@/lib/services/settings/permissions/permissions.service';

// ✅ 2. Importem els tipus del servei
import type { Permission, FormState } from '@/lib/services/settings/permissions/permissions.service';

/**
 * Actualitza tots els permisos d'inbox per a l'equip actiu.
 */
export async function updateInboxPermissionsAction(permissions: Permission[]): Promise<FormState> {
  // 1. Validació de sessió
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // 2. Crida al servei
  // Tota la lògica (comprovació de rol, delete, insert) està ara al servei.
  const result = await permissionsService.updateInboxPermissions(
    supabase, 
    user, 
    activeTeamId, 
    permissions
  );

  // 3. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/settings/permissions');
  }

  return result;
}