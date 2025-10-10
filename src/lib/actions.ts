"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared"; // O la teva definició de ServerActionResult

// Exemple: Acció per esborrar un element
export async function deleteItemAction(itemId: string): Promise<ActionResult> {
    
    // ✅ 1. Validació de la sessió a l'inici.
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    // Desestructurem el que necessitem per a aquesta acció.
    const { supabase, activeTeamId } = session;

    try {
        // ✅ 2. Lògica de negoci.
        // La consulta inclou el filtre de seguretat amb 'activeTeamId'.
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId)
            .eq('team_id', activeTeamId);

        if (error) {
            // Si hi ha un error de BBDD, el llancem per ser capturat pel catch.
            throw error;
        }

        // ✅ 3. Revalidació de la memòria cau en cas d'èxit.
        revalidatePath('/items');
        revalidatePath(`/items/${itemId}`);

        // ✅ 4. Retornem una resposta d'èxit.
        return { success: true, message: "Element esborrat correctament." };

    } catch (error: unknown) {
        // ✅ 5. Gestió centralitzada d'errors.
        const message = error instanceof Error ? error.message : "Error desconegut.";
        console.error("Error a deleteItemAction:", message);
        return { success: false, message };
    }
}