// src/lib/services/settings/permissions.service.ts (FITXER NOU I COMPLET)
"use server";

import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { Role } from '@/lib/permissions/permissions.config'; // Assegurem que el tipus Role existeix

// --- Tipus Públics del Servei ---

export type Member = { 
  id: string; 
  full_name: string | null; 
  email: string | null; 
};

export type Permission = { 
  grantee_user_id: string; // Qui rep el permís
  target_user_id: string;  // De qui veurà els correus
};

// Dades que la pàgina necessita
export type PermissionsPageData = {
  teamMembers: Member[];
  initialPermissions: Permission[];
};

// Retorn de l'acció
export type FormState = {
  success: boolean;
  message: string;
};

// ---
// ⚙️ FUNCIONS DE LECTURA (per a la pàgina)
// ---

/**
 * SERVEI: Obté les dades per a la pàgina de permisos (membres i permisos).
 * (Lògica extreta de 'page.tsx')
 */
export async function getPermissionsPageData(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<PermissionsPageData> {

  const [membersRes, permissionsRes] = await Promise.all([
    supabase.from('team_members').select('profiles(id, full_name, email)').eq('team_id', teamId),
    supabase.from('inbox_permissions').select('grantee_user_id, target_user_id').eq('team_id', teamId)
  ]);

  const teamMembers: Member[] = membersRes.data
    ?.map(m => m.profiles)
    .filter(Boolean) as unknown as Member[] || [];
    
  const initialPermissions: Permission[] = permissionsRes.data || [];

  return { teamMembers, initialPermissions };
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (per a les Server Actions)
// ---

/**
 * SERVEI: Actualitza tots els permisos d'inbox per a l'equip.
 * Inclou comprovació de permisos i lògica de BBDD.
 * (Lògica extreta de 'updateInboxPermissionsAction')
 */
export async function updateInboxPermissions(
  supabase: SupabaseClient<Database>,
  user: User,
  teamId: string,
  permissions: Permission[]
): Promise<FormState> {
  
  // 1. Comprovació de permisos (Lògica de negoci)
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .single();

  if (!['owner', 'admin'].includes(member?.role || '')) {
    return { success: false, message: "No tens permisos per a gestionar els permisos de l'inbox." };
  }
  
  // 2. Lògica d'accés a dades
  try {
    // Estratègia "esborrar i tornar a crear"
    await supabase.from('inbox_permissions').delete().eq('team_id', teamId);

    if (permissions.length > 0) {
      const permissionsToInsert = permissions.map(p => ({ ...p, team_id: teamId }));
      await supabase.from('inbox_permissions').insert(permissionsToInsert).throwOnError();
    }

    return { success: true, message: "Permisos actualitzats correctament." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconegut en desar els permisos.";
    return { success: false, message };
  }
}