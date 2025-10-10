"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from '@/lib/supabase/session'; // Importem la nova funció
// El tipus de dades que rebrem del client
type Permission = {
    grantee_user_id: string; // Qui rep el permís
    target_user_id: string;  // De qui veurà els correus
};

/**
 * Actualitza tots els permisos d'inbox per a l'equip actiu.
 */
export async function updateInboxPermissionsAction(permissions: Permission[]) {
    // ✅ 2. Validació centralitzada
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    // Comprovació de rol: només owners/admins poden canviar permisos
    const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
    if (!['owner', 'admin'].includes(member?.role || '')) {
        return { success: false, message: "No tens permisos per a gestionar els permisos de l'inbox." };
    }
    
    try {
        // Estratègia "esborrar i tornar a crear": és la més simple i robusta.
        // 1. Esborrem tots els permisos existents per a aquest equip.
        await supabase.from('inbox_permissions').delete().eq('team_id', activeTeamId);

        // 2. Si hi ha nous permisos per a desar, els inserim.
        if (permissions.length > 0) {
            const permissionsToInsert = permissions.map(p => ({ ...p, team_id: activeTeamId }));
            await supabase.from('inbox_permissions').insert(permissionsToInsert).throwOnError();
        }

        revalidatePath('/settings/permissions');
        return { success: true, message: "Permisos actualitzats correctament." };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut en desar els permisos.";
        return { success: false, message };
    }
}