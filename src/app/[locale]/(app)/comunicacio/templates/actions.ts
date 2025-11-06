// /src/app/[locale]/(app)/comunicacio/templates/actions.ts (FITXER COMPLET I BLINDAT)
"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

// ✅ 1. Importem els guardians
import {
  PERMISSIONS,
  validateSessionAndPermission,
  validateActionAndUsage 
} from "@/lib/permissions/permissions";

import type { EmailTemplate } from "@/types/db";
import * as templatesService from "@/lib/services/comunicacio/templates.service";

type TemplateInput = Omit<EmailTemplate, "id" | "created_at" | "user_id" | "team_id">;

/**
 * ACCIÓ: Desa (crea o actualitza) una plantilla d'email.
 */
export async function saveTemplateAction(
    templateData: TemplateInput,
    templateId: string | null
): Promise<{ data: EmailTemplate | null; error: PostgrestError | null }> {
    
    let validation;
    const isCreatingNew = !templateId || templateId === "-1"; // El teu hook fa servir -1

    // ✅ 2. Triem el guardià correcte
    if (isCreatingNew) {
      // --- ÉS UNA CREACIÓ ---
      // Validem Sessió + Permís de Rol + Límit de Pla
      validation = await validateActionAndUsage(
        PERMISSIONS.MANAGE_TEMPLATES,
        'maxEmailTemplates' // <-- Comprovem el límit
      );
    } else {
      // --- ÉS UNA ACTUALITZACIÓ ---
      // Validem només Sessió + Permís de Rol
      validation = await validateSessionAndPermission(
        PERMISSIONS.MANAGE_TEMPLATES
      );
    }

    if ('error' in validation) {
        return { data: null, error: { message: validation.error.message } as PostgrestError };
    }
    
    const { supabase, user, activeTeamId } = validation;

    try {
        const data = await templatesService.saveTemplate(
            supabase,
            templateData,
            templateId,
            user.id,
            activeTeamId
        );

        revalidatePath('/comunicacio/templates');
        return { data, error: null };
    } catch (error: unknown) {
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
    
    // ✅ 3. VALIDACIÓ 2-EN-1 (Sessió + Rol)
    const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEMPLATES);
    if ('error' in validation) {
        return { error: { message: validation.error.message } as PostgrestError };
    }
    const { supabase, activeTeamId } = validation;

    try {
        await templatesService.deleteTemplate(supabase, templateId, activeTeamId);
        revalidatePath('/comunicacio/templates');
        return { error: null };
    } catch (error: unknown) {
        console.error("Error en deleteTemplateAction:", error);
        return { error: { message: (error as Error).message } as PostgrestError };
    }
}