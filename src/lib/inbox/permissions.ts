// Ubicació: /lib/inbox/permissions.ts (fitxer nou)

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

type InboxPermissionContext = {
    user: User;
    activeTeamId: string;
    visibleUserIds: string[];
};

/**
 * Funció reutilitzable per obtenir el context de permisos de l'inbox.
 * Valida la sessió i retorna l'usuari, l'equip actiu i els IDs de les bústies visibles.
 * @returns El context de permisos o null si la sessió no és vàlida.
 */
export async function getInboxPermissionContext(): Promise<InboxPermissionContext | null> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return null;

    const { data: permissions } = await supabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', activeTeamId)
        .eq('grantee_user_id', user.id);
        
    const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id).filter(Boolean) as string[] || [])];

    return { user, activeTeamId, visibleUserIds };
}