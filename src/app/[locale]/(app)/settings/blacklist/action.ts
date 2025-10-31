"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions/permissions";

/**
 * Afegeix una nova regla a la blacklist per a l'equip actiu.
 */
export async function addRuleAction(formData: FormData) {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // ✅ REFACTORITZACIÓ: Comprovació de permisos. Només usuaris autoritzats poden afegir regles.
  const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
  if (!hasPermission(member?.role, PERMISSIONS.MANAGE_BLACKLIST)) {
    return { success: false, message: "No tens permisos per a gestionar la llista negra." };
  }

  const newRule = formData.get('newRule') as string;
  if (!newRule || !newRule.trim()) {
    return { success: false, message: "La regla no pot estar buida." };
  }

  const value = newRule.trim().toLowerCase();
  const rule_type = value.includes('@') ? 'email' : 'domain';

  const { error } = await supabase.from('blacklist_rules').insert({
    user_id: user.id,
    team_id: activeTeamId,
    value,
    rule_type
  });

  if (error) {
    console.error('Error afegint regla de blacklist:', error);
    return { success: false, message: "No s'ha pogut afegir la regla. Potser ja existeix." };
  }

  revalidatePath('/settings/blacklist');
  return { success: true, message: "Regla afegida correctament." };
}

/**
 * Elimina una regla de la blacklist.
 */
export async function deleteRuleAction(id: string) {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // ✅ REFACTORITZACIÓ: Comprovació de permisos abans d'intentar l'eliminació.
  const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
  if (!hasPermission(member?.role, PERMISSIONS.MANAGE_BLACKLIST)) {
    return { success: false, message: "No tens permisos per a gestionar la llista negra." };
  }

  // La política RLS a la base de dades s'encarregarà de la seguretat a nivell de fila.
  const { error } = await supabase.from('blacklist_rules').delete().eq('id', id);

  if (error) {
    console.error('Error eliminant regla de blacklist:', error);
    return { success: false, message: "No s'ha pogut eliminar la regla." };
  }

  revalidatePath('/settings/blacklist');
  return { success: true, message: "Regla eliminada correctament." };
}
