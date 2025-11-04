// src/app/[locale]/(app)/settings/billing/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from '@/lib/supabase/session';

// ✅ 1. Importem el NOU servei
import * as billingService from '@/lib/services/settings/billing/billing.service';

// ✅ 2. Importem els tipus NOMÉS PER A ÚS INTERN
import type { FormState } from '@/lib/services/settings/billing/billing.service';

// --- Acció per Subscriure's ---

export async function subscribeToPlanAction(planId: string): Promise<FormState> {
  // 1. Validació de sessió
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // 2. Crida al servei
  const result = await billingService.subscribeToPlan(supabase, user, activeTeamId, planId);

  // 3. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/settings/billing');
    // Important: També revalidem el layout de l'app si el pla canvia,
    // ja que pot afectar la UI (p.ex. un bàner d'actualització)
    revalidatePath('/[locale]/(app)', 'layout');
  }

  return result;
}

// --- Acció per Cancel·lar ---

export async function cancelSubscriptionAction(): Promise<FormState> {
  // 1. Validació de sessió
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // 2. Crida al servei
  const result = await billingService.cancelSubscription(supabase, user, activeTeamId);

  // 3. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/settings/billing');
    revalidatePath('/[locale]/(app)', 'layout');
  }

  return result;
}