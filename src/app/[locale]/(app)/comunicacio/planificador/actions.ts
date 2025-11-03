// src/app/[locale]/(app)/comunicacio/planificador/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { validateSessionAndPermission, PERMISSIONS } from "@/lib/permissions/permissions";
import { type ActionResult } from "@/types/shared/index";

// ✅ CANVI: Importem el tipus des de la font de la veritat
import type { SocialPost } from "@/types/db"; 

// ✅ NOU: Importem el nostre servei
import * as socialPlannerService from "@/lib/services/comunicacio/socialPlanner.service";


/**
 * Funció d'ajuda interna per a validar la sessió i els permisos.
 * (Es queda aquí perquè gestiona i18n i la sessió, propis de l'Action)
 */
async function validateSocialPlannerPermissions() {
    const validationResult = await validateSessionAndPermission(PERMISSIONS.MANAGE_INTEGRATIONS);

    if ('error' in validationResult) {
        const t = await getTranslations('Errors');
        return { error: t('permissionDenied') };
    }
    return validationResult;
}
// ----------------------------------------------------------------------------------

/**
 * ACCIÓ: Crea una URL de pujada signada (presigned URL).
 */
export async function getPresignedUploadUrlAction(fileNames: string[]): Promise<ActionResult<{ signedUrls: { signedUrl: string; path: string; }[] }>> {
    
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) {
        return { success: false, message: validation.error };
    }
    const { supabase, user, activeTeamId } = validation;

    if (!activeTeamId) {
       return { success: false, message: "Equip actiu no trobat." };
    }

    try {
        // ✅ Cridem al servei
        const { signedUrls } = await socialPlannerService.getPresignedUploadUrls(
            supabase,
            fileNames,
            user.id,
            activeTeamId
        );
        return { success: true, message: "URLs creades.", data: { signedUrls } };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconegut creant URLs signades.";
        return { success: false, message };
    }
}

/**
 * ACCIÓ: Crea un registre de publicació en esborrany.
 */
export async function createSocialPostAction(
    content: string,
    providers: string[],
    mediaPaths: string[] | null,
    mediaType: string | null
): Promise<ActionResult<SocialPost>> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) {
        return { success: false, message: validation.error };
    }
    const { supabase, user, activeTeamId } = validation;
    const t = await getTranslations('Planificador.toasts');

    try {
        // ✅ Cridem al servei
        const postData = await socialPlannerService.createSocialPost(
            supabase,
            content,
            providers,
            mediaPaths,
            mediaType,
            user.id,
            activeTeamId
        );

        revalidatePath('/comunicacio/planificador');
        return { success: true, message: t('successDraftCreated'), data: postData };
    } catch (error: unknown) {
        console.error("Error creant la publicació (action):", error);
        return { success: false, message: (error as Error).message || t('errorPostCreation') };
    }
}

/**
 * ACCIÓ: Planifica una publicació.
 */
export async function scheduleSocialPostAction(postId: number, scheduledAt: string): Promise<ActionResult> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) return { success: false, message: validation.error };
    const { supabase } = validation;
    const t = await getTranslations('Planificador.toasts');

    try {
        // ✅ Cridem al servei
        await socialPlannerService.scheduleSocialPost(supabase, postId, scheduledAt);
        revalidatePath('/comunicacio/planificador');
        return { success: true, message: t('successScheduled') };
    } catch (error: unknown) {
        console.error("Error planificant la publicació (action):", error);
        return { success: false, message: (error as Error).message || t('errorScheduling') };
    }
}

/**
 * ACCIÓ: Retorna una publicació a l'estat d'esborrany.
 */
export async function unscheduleSocialPostAction(postId: number): Promise<ActionResult> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) return { success: false, message: validation.error };
    const { supabase } = validation;
    const t = await getTranslations('Planificador.toasts'); 
    
    try {
        // ✅ Cridem al servei
        await socialPlannerService.unscheduleSocialPost(supabase, postId);
        revalidatePath('/comunicacio/planificador');
        return { success: true, message: t('successUnscheduled') };
    } catch (error: unknown) {
        console.error("Error desplanificant la publicació (action):", error);
        return { success: false, message: (error as Error).message || t('errorUnscheduling') };
    }
}

/**
 * ACCIÓ: Elimina una publicació social.
 */
export async function deleteSocialPostAction(postId: number): Promise<ActionResult> {
    const validation = await validateSocialPlannerPermissions();
    if ('error' in validation) return { success: false, message: validation.error };
    const { supabase } = validation;
    const t = await getTranslations('Planificador.toasts');

    try {
        // ✅ Cridem al servei
        await socialPlannerService.deleteSocialPost(supabase, postId);
        revalidatePath('/comunicacio/planificador');
        return { success: true, message: t('successPostDeleted') };
    } catch (error: unknown) {
        console.error("Error eliminant la publicació (action):", error);
        return { success: false, message: (error as Error).message || t('errorDeleting') };
    }
}