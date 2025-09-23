"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Desa una oportunitat (crea o actualitza) assignant-la a l'equip correcte.
 */
export async function saveOpportunityAction(formData: FormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };

    // --- LÒGICA D'EQUIP ---
    // 1. Obtenim l'equip de l'usuari.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();
    if (memberError || !member) {
        return { error: { message: "No s'ha pogut determinar l'equip." } };
    }
    const teamId = member.team_id;
    // ----------------------

    const rawData = Object.fromEntries(formData.entries());
    const dataToSave = {
        name: rawData.name as string,
        description: rawData.description as string,
        contact_id: rawData.contact_id as string,
        stage_name: rawData.stage_name as string,
        value: rawData.value ? parseFloat(rawData.value as string) : null,
        close_date: rawData.close_date ? new Date(rawData.close_date as string).toISOString() : null,
        user_id: user.id, // Per saber qui el va crear
        team_id: teamId,  // ✅ Línia clau: assignem l'oportunitat a l'equip
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
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };
 
    try {
        // ✅ ELIMINEM el filtre de 'user_id'. Ara qualsevol membre de l'equip
        // hauria de poder moure les oportunitats. La seguretat real
        // vindrà amb la política de RLS (Fase 4), que impedirà que un usuari
        // d'un altre equip pugui modificar res.
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
