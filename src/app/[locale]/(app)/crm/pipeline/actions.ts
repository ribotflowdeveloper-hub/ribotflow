"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la nostra funció d'ajuda

/**
 * Desa una oportunitat (crea o actualitza).
 */
export async function saveOpportunityAction(formData: FormData) {
    // ✅ 2. Tota la validació de sessió es redueix a aquestes 3 línies.
    const session = await validateUserSession();
    if ('error' in session) return { error: session.error };
    const { supabase, user, activeTeamId } = session;

    const rawData = Object.fromEntries(formData.entries());
    const dataToSave = {
        name: rawData.name as string,
        description: rawData.description as string,
        contact_id: rawData.contact_id as string,
        stage_name: rawData.stage_name as string,
        value: rawData.value ? parseFloat(rawData.value as string) : null,
        close_date: rawData.close_date ? new Date(rawData.close_date as string).toISOString() : null,
        user_id: user.id,
        team_id: activeTeamId,
    };

    try {
        const { error } = await (rawData.id
            ? supabase.from("opportunities").update(dataToSave).eq("id", rawData.id)
            : supabase.from("opportunities").insert(dataToSave));
        if (error) throw error;

        revalidatePath("/crm/pipeline");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { error: { message } };
    }
}
 
/**
 * Actualitza l'etapa d'una oportunitat (per al drag-and-drop).
 */
export async function updateOpportunityStageAction(opportunityId: string, newStage: string) {
    // ✅ Fem el mateix aquí.
    const session = await validateUserSession();
    if ('error' in session) return { error: session.error };
    const { supabase, activeTeamId } = session;
 
    try {
        // La RLS s'encarregarà de la seguretat a nivell de fila.
        const { error } = await supabase
            .from("opportunities")
            .update({ stage_name: newStage })
            .eq("id", opportunityId)
            .eq("team_id", activeTeamId);

 
        if (error) throw error;
 
        revalidatePath("/crm/pipeline");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { error: { message } };
    }
}