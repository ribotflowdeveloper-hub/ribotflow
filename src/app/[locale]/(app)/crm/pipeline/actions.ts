// /app/[locale]/(app)/crm/pipeline/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";

// ✅ 1. Importem el servei d'oportunitats
import * as opportunityService from "@/lib/services/crm/pipeline/opportunities.service";

/**
 * ACCIÓ: Desa (crea o actualitza) una oportunitat.
 */
export async function saveOpportunityAction(formData: FormData) {
    // 1. Validació de sessió
    const session = await validateUserSession();
    if ('error' in session) return { error: session.error };
    const { supabase, user, activeTeamId } = session;

    try {
        // 2. Cridem al servei
        await opportunityService.saveOpportunity(
            supabase,
            formData,
            user.id,
            activeTeamId
        );

        // 3. Efecte secundari
        revalidatePath("/crm/pipeline");
        return { success: true };

    } catch (error: unknown) {
        // 4. Gestió d'errors
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { error: { message } };
    }
}
 
/**
 * ACCIÓ: Actualitza l'etapa d'una oportunitat (per Drag-n-Drop).
 */
export async function updateOpportunityStageAction(opportunityId: number, newStage: string) {
    // 1. Validació de sessió
    const session = await validateUserSession();
    if ('error' in session) return { error: session.error };
    const { supabase, activeTeamId } = session;
 
    try {
        // 2. Cridem al servei
        await opportunityService.updateOpportunityStage(
            supabase,
            opportunityId,
            newStage,
            activeTeamId
        );
 
        // 3. Efecte secundari
        revalidatePath("/crm/pipeline");
        return { success: true };

    } catch (error: unknown) {
        // 4. Gestió d'errors
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { error: { message } };
    }
}