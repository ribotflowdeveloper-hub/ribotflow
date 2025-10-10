"use server";

import { validateUserSession } from "@/lib/supabase/session";


/**
 * Obté les dades detallades d'un sol equip, incloent el nom del propietari,
 * utilitzant dues consultes separades per a més robustesa.
 */
export async function getTeamDetailsAction(teamId: string) {
    if (!teamId) {
        return { success: false, message: "Falta l'ID de l'equip." };
    }

    // ✅ 1. Validem la sessió primer. Això ens dona un client de Supabase segur.
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        // PAS 1: Obtenim les dades principals de l'equip des de la taula 'teams'.
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('*') // Obtenim totes les columnes de l'equip
            .eq('id', teamId)
            .single();

        if (teamError || !teamData) {
            throw new Error("No s'ha pogut trobar l'equip especificat.");
        }

        // PAS 2: Si l'equip té un propietari, busquem el seu nom a la taula 'profiles'.
        let ownerData = null;
        if (teamData.owner_id) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', teamData.owner_id)
                .single();

            // Si hi ha un error en trobar el perfil, no fem que tot falli.
            // Simplement, el nom del propietari serà 'null'.
            if (profileError) {
                console.warn(`No s'ha trobat el perfil per a l'owner_id ${teamData.owner_id}:`, profileError.message);
            } else {
                ownerData = { full_name: profileData.full_name };
            }
        }

        // PAS 3: Combinem les dades manualment en l'objecte final.
        const detailedProfile = {
            ...teamData,
            owner: ownerData,
        };

        return { success: true, data: detailedProfile };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en obtenir les dades.";
        console.error("Error a getTeamDetailsAction:", message);
        return { success: false, message };
    }
}