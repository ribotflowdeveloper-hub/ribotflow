// a l'arxiu d'accions del pipeline

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Desa una oportunitat (crea o actualitza) assignant-la a l'equip actiu de l'usuari.
 */
export async function saveOpportunityAction(formData: FormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };

    // --- NOVA LÒGICA D'EQUIP ACTIU ---
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { error: { message: "No s'ha pogut determinar l'equip actiu." } };
    }
    // ---------------------------------

    const rawData = Object.fromEntries(formData.entries());
    const dataToSave = {
        name: rawData.name as string,
        description: rawData.description as string,
        contact_id: rawData.contact_id as string,
        stage_name: rawData.stage_name as string,
        value: rawData.value ? parseFloat(rawData.value as string) : null,
        close_date: rawData.close_date ? new Date(rawData.close_date as string).toISOString() : null,
        user_id: user.id,
        team_id: activeTeamId, // ✅ Assignem l'oportunitat a l'equip actiu
    };

    try {
        // La política RLS 'WITH CHECK' verificarà que l'usuari té permís per escriure en aquest team_id.
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
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };
 
    try {
        // Aquesta consulta ara és segura. La política RLS de la taula 'opportunities'
        // impedirà que un usuari modifiqui una oportunitat que no pertany al seu equip actiu.
        const { error } = await supabase
            .from("opportunities")
            .update({ stage_name: newStage })
            .eq("id", opportunityId);
 
        if (error) throw error;
 
        revalidatePath("/crm/pipeline");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { error: { message } };
    }
}