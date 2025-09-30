// A l'arxiu d'accions del pipeline

"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la nostra funció d'ajuda

/**
 * Desa una oportunitat (crea o actualitza) assignant-la a l'equip actiu de l'usuari.
 */
export async function saveOpportunityAction(
    formData: FormData
): Promise<{ success?: boolean; error?: { message: string } }> {
    
    // ✅ 2. Validació centralitzada i segura de la sessió.
    const session = await validateUserSession();
    if ('error' in session) {
        return { error: session.error };
    }
    const { supabase, user, activeTeamId } = session;

    // Obtenim l'ID per saber si estem creant o editant.
    const id = formData.get('id') as string | null;

    // Construïm l'objecte de dades a desar.
    const dataToSave = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        contact_id: formData.get('contact_id') as string,
        stage_name: formData.get('stage_name') as string,
        value: parseFloat(formData.get('value') as string) || 0,
        close_date: formData.get('close_date') ? new Date(formData.get('close_date') as string).toISOString() : null,
        // ✅ 3. Assegurem que l'oportunitat SEMPRE s'associa a l'usuari i a l'equip actiu.
        user_id: user.id,
        team_id: activeTeamId,
    };

    // Validació bàsica de camps obligatoris.
    if (!dataToSave.name || !dataToSave.contact_id) {
        return { error: { message: 'El nom i el contacte són obligatoris.' } };
    }
 
    try {
        let query;
        // Si hi ha un ID, actualitzem ('update').
        if (id && id !== 'new') {
            query = supabase.from('opportunities').update(dataToSave).eq('id', id);
        } else { 
            // Si no, inserim ('insert').
            query = supabase.from('opportunities').insert(dataToSave);
        }

        const { error } = await query;
        if (error) throw error;

        revalidatePath('/crm/pipeline');
        return { success: true };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        console.error("Error en desar l'oportunitat:", message);
        return { error: { message } };
    }
}