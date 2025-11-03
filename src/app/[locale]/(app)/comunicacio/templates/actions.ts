// src/app/[locale]/(app)/comunicacio/templates/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { validateUserSession } from "@/lib/supabase/session";

// ✅ 1. Importem el tipus correcte des de la font de la veritat
import type { EmailTemplate } from "@/types/db";

// ✅ 2. Importem el nostre nou servei
import * as templatesService from "@/lib/services/comunicacio/templates.service";

// Tipus per a les dades d'entrada, basat en el tipus real de la BD
type TemplateInput = Omit<EmailTemplate, "id" | "created_at" | "user_id" | "team_id">;

/**
 * ACCIÓ: Desa (crea o actualitza) una plantilla d'email.
 */
export async function saveTemplateAction(
    templateData: TemplateInput,
    templateId: string | null
): Promise<{ data: EmailTemplate | null; error: PostgrestError | null }> {
    // 1. Validació de sessió
    const session = await validateUserSession();
    if ('error' in session) {
        return { data: null, error: { message: session.error.message } as PostgrestError };
    }
    const { supabase, user, activeTeamId } = session;

    try {
        // 2. Crida al servei
        const data = await templatesService.saveTemplate(
            supabase,
            templateData,
            templateId,
            user.id,
            activeTeamId
        );

        // 3. Efecte secundari
        revalidatePath('/comunicacio/templates');
        return { data, error: null };
    } catch (error: unknown) {
        // 4. Gestió d'errors
        console.error("Error en saveTemplateAction:", error);
        return { data: null, error: { message: (error as Error).message } as PostgrestError };
    }
}

/**
 * ACCIÓ: Elimina una plantilla d'email.
 */
export async function deleteTemplateAction(
    templateId: string
): Promise<{ error: PostgrestError | null }> {
    // 1. Validació de sessió
    const session = await validateUserSession();
    if ('error' in session) {
        return { error: { message: session.error.message } as PostgrestError };
    }
    const { supabase, activeTeamId } = session;

    try {
        // 2. Crida al servei
        await templatesService.deleteTemplate(supabase, templateId, activeTeamId);

        // 3. Efecte secundari
        revalidatePath('/comunicacio/templates');
        return { error: null };
    } catch (error: unknown) {
        // 4. Gestió d'errors
        console.error("Error en deleteTemplateAction:", error);
        return { error: { message: (error as Error).message } as PostgrestError };
    }
}