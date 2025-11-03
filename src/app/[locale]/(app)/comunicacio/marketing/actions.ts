// Ubicació: /app/(app)/comunicacio/marketing/actions.ts

'use server';

import { revalidatePath } from 'next/cache';
import { validateUserSession } from '@/lib/supabase/session';
import { createClient as createSupabaseServerClient} from '@/lib/supabase/server'; // Necessari per crear el client
import { marketingService } from '@/lib/services/comunicacio/marketing.service'; // ✅ Importem el servei!
import type { Strategy, Campaign } from '@/types/comunicacio/marketing'; // ✅ Importem els tipus centralitzats!

/**
 * @summary Genera idees d'estratègies de màrqueting.
 * @description Aquesta acció ara només orquestra. La lògica de 'prompt' i API està al servei.
 */
export async function generateStrategiesAction(
  goal: string,
): Promise<{ data: Strategy[] | null; error: string | null }> {
  if (!goal) {
    return { data: null, error: "L'objectiu no pot estar buit." };
  }
  // La crida a Gemini no requereix autenticació d'usuari, cridem el servei directament.
  return await marketingService.generateStrategies(goal);
}

/**
 * @summary Redacta el contingut d'una campanya.
 * @description La lògica de 'prompt' i API està al servei.
 */
export async function draftContentAction(
  goal: string,
  strategy: Strategy,
): Promise<{ data: string | null; error: string | null }> {
  if (!goal || !strategy) {
    return { data: null, error: 'Falten dades per redactar el contingut.' };
  }
  return await marketingService.draftContent(goal, strategy);
}

/**
 * @summary Desa una nova campanya.
 * @description Valida la sessió i demana al servei que desi les dades.
 */
export async function saveCampaignAction(
  campaignData: Partial<Campaign>,
  goal: string,
) {
  // 1. Validació de sessió
  const sessionResult = await validateUserSession();
  if ('error' in sessionResult) {
    return { data: null, error: sessionResult.error };
  }
  const { user, activeTeamId } = sessionResult;

  // 2. Creació del client de BBDD
  const supabase = createSupabaseServerClient();

  // 3. Crida al servei
  const { data, error } = await marketingService.saveCampaign(
    supabase,
    activeTeamId,
    user.id,
    campaignData,
    goal,
  );

  if (error) {
    console.error('Error en desar la campanya (Service):', error);
    return { data: null, error: error.message };
  }

  // 4. Efecte secundari
  revalidatePath('/comunicacio/marketing');
  
  // 5. Retornar dades
  return { data, error: null };
}

/**
 * @summary Actualitza una campanya.
 * @description Valida la sessió i demana al servei que actualitzi les dades.
 */
export async function updateCampaignAction(
  campaignId: string,
  name: string,
  content: string,
) {
  // 1. Validació de sessió
  const sessionResult = await validateUserSession();
  if ('error' in sessionResult) {
    return { data: null, error: sessionResult.error };
  }
  const { activeTeamId } = sessionResult;

  // 2. Creació del client de BBDD
  const supabase = createSupabaseServerClient();

  // 3. Crida al servei
  const { error } = await marketingService.updateCampaign(
    supabase,
    campaignId,
    { name, content },
    activeTeamId,
  );

  if (error) {
    console.error('Error en actualitzar la campanya (Service):', error);
    return { error: error.message };
  }

  // 4. Efecte secundari
  revalidatePath('/comunicacio/marketing');
  
  // 5. Retornar dades
  return { error: null };
}