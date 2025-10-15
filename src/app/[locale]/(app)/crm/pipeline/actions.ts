// /app/[locale]/(app)/crm/pipeline/actions.ts (Refactoritzat)

"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";

export async function saveOpportunityAction(formData: FormData) {
    const session = await validateUserSession();
    if ('error' in session) return { error: session.error };
    const { supabase, user, activeTeamId } = session;

    const rawData = Object.fromEntries(formData.entries());
    
    // ✅ Convertim els IDs a números abans de desar.
    const contactId = rawData.contact_id ? parseInt(rawData.contact_id as string, 10) : null;

    const dataToSave = {
        name: rawData.name as string,
        description: rawData.description as string,
        contact_id: contactId,
        stage_name: rawData.stage_name as string,
        value: rawData.value ? parseFloat(rawData.value as string) : null,
        close_date: rawData.close_date ? new Date(rawData.close_date as string).toISOString() : null,
        user_id: user.id,
        team_id: activeTeamId,
    };

    try {
        const { error } = await (rawData.id
            // Si estem actualitzant, l'ID ja és un número.
            ? supabase.from("opportunities").update(dataToSave).eq("id", parseInt(rawData.id as string, 10))
            : supabase.from("opportunities").insert(dataToSave));
        if (error) throw error;

        revalidatePath("/crm/pipeline");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { error: { message } };
    }
}
 
export async function updateOpportunityStageAction(opportunityId: number, newStage: string) {
    const session = await validateUserSession();
    if ('error' in session) return { error: session.error };
    const { supabase, activeTeamId } = session;
 
    try {
        const { error } = await supabase
            .from("opportunities")
            .update({ stage_name: newStage })
            // ✅ L'ID que rebem ja és un número.
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