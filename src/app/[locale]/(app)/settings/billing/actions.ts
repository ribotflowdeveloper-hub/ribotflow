"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUserSession } from '@/lib/supabase/session'; // Importem la nova funció

/**
 * Subscriu l'equip actiu de l'usuari a un nou pla.
 * En un entorn real, aquesta funció crearia una sessió de checkout de Stripe.
 * Ara mateix, només crea/actualitza la subscripció a la nostra base de dades.
 */
/**
 * Subscriu l'equip actiu de l'usuari a un nou pla.
 */
export async function subscribeToPlanAction(planId: string) {
    // ✅ 2. Validació centralitzada
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    try {
        await supabase
            .from('subscriptions')
            .upsert({
                team_id: activeTeamId,
                plan_id: planId,
                status: 'active',
                current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
            }, { onConflict: 'team_id' })
            .throwOnError();

        // ✅ PAS CLAU: Actualitzem el token de l'usuari amb el nou pla.
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { app_metadata: { ...user.app_metadata, active_team_plan: planId } }
        );

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error en subscriure's al pla.";
        return { success: false, message };
    }

    revalidatePath('/settings/billing');
    return { success: true, message: `Subscripció al pla '${planId}' realitzada!` };
}

/**
 * Cancel·la la subscripció de l'equip actiu.
 */
export async function cancelSubscriptionAction() {
    // ✅ 2. Validació centralitzada
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    // Per a cancel·lar, necessitem permisos d'administrador de l'equip.
    // Ho gestionarem amb una comprovació de rol.
    const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
    if (member?.role !== 'owner') {
        return { success: false, message: "Només el propietari de l'equip pot cancel·lar la subscripció." };
    }

    try {
        await createClient()
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('team_id', activeTeamId)
            .throwOnError();

        // ✅ PAS CLAU: Actualitzem també el token de l'usuari per a reflectir la cancel·lació.
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { app_metadata: { ...user.app_metadata, active_team_plan: 'free' } }
        );


    } catch (error) {
        const message = error instanceof Error ? error.message : "Error en cancel·lar la subscripció.";
        return { success: false, message };
    }

    revalidatePath('/settings/billing');
    return { success: true, message: "Subscripció cancel·lada." };
}