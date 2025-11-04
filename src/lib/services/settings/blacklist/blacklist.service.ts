// src/lib/services/settings/blacklist.service.ts (FITXER NOU I COMPLET)
"use server";

import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { type Database, type Tables } from '@/types/supabase';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/permissions/permissions.config';
import type { BlacklistRule } from '@/types/settings';

// --- Tipus Públics del Servei ---

// El que espera 'useFormState' a les Server Actions
export type FormState = {
  success: boolean;
  message: string;
};

// ---
// ⚙️ FUNCIONS DE LECTURA (per a la pàgina)
// ---

/**
 * SERVEI: Obté les regles de la blacklist per a l'equip actiu.
 * S'encarrega de filtrar per equip i transformar les dades.
 */
export async function getBlacklistRules(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<BlacklistRule[]> {
  
  const { data: rulesFromDb, error } = await supabase
    .from('blacklist_rules')
    .select('*')
    .eq('team_id', teamId) // ✅ SEGURETAT: Assegurem filtrar per equip
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar les regles de la blacklist (service):", error.message);
    return [];
  }

  // ✅ Lògica de transformació moguda del component al servei
  const formattedRules: BlacklistRule[] = (rulesFromDb || [])
    // 1. Filtrem (tot i que el 'eq' ja ho hauria d'haver fet)
    .filter(rule => !!rule.team_id) 
    // 2. Transformem tipus
    .map(rule => ({
      ...rule,
      id: String(rule.id), // Converteix id: number -> string (si fos necessari)
      team_id: rule.team_id as string, // Assegurem el tipus
      rule_type: rule.rule_type as 'domain' | 'email', // Assegurem l'ENUM
    }));
  
  return formattedRules;
}

// Funció helper interna per obtenir rol (evita duplicació)
async function getUserRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  teamId: string
): Promise<Role | null> {
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single();
  
  return (member?.role as Role) || null;
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (per a les Server Actions)
// ---

/**
 * SERVEI: Afegeix una nova regla de blacklist.
 * Inclou comprovació de permisos i validació de dades.
 */
export async function addRule(
  supabase: SupabaseClient<Database>,
  user: User,
  teamId: string,
  formData: FormData
): Promise<FormState> {
  
  // 1. Comprovació de permisos
  const userRole = await getUserRole(supabase, user.id, teamId);
  if (!hasPermission(userRole, PERMISSIONS.MANAGE_BLACKLIST)) {
    return { success: false, message: "No tens permisos per a gestionar la llista negra." };
  }

  // 2. Validació i Lògica de Negoci
  const newRule = formData.get('newRule') as string;
  if (!newRule || !newRule.trim()) {
    return { success: false, message: "La regla no pot estar buida." };
  }

  const value = newRule.trim().toLowerCase();
  const rule_type = value.includes('@') ? 'email' : 'domain';

  // 3. Accés a Dades
  const { error } = await supabase.from('blacklist_rules').insert({
    user_id: user.id,
    team_id: teamId,
    value,
    rule_type
  });

  if (error) {
    console.error('Error afegint regla de blacklist (service):', error);
    return { success: false, message: "No s'ha pogut afegir la regla. Potser ja existeix." };
  }

  return { success: true, message: "Regla afegida correctament." };
}

/**
 * SERVEI: Elimina una regla de la blacklist.
 * Inclou comprovació de permisos.
 */
export async function deleteRule(
  supabase: SupabaseClient<Database>,
  user: User,
  teamId: string,
  id: string
): Promise<FormState> {

  // 1. Comprovació de permisos
  const userRole = await getUserRole(supabase, user.id, teamId);
  if (!hasPermission(userRole, PERMISSIONS.MANAGE_BLACKLIST)) {
    return { success: false, message: "No tens permisos per a gestionar la llista negra." };
  }

  // 2. Accés a Dades
  // L'RLS s'encarregarà de la seguretat a nivell de fila, 
  // però el permís d'usuari és una bona primera barrera.
  const numericId = Number(id);
  const { error } = await supabase.from('blacklist_rules').delete().eq('id', numericId);

  if (error) {
    console.error('Error eliminant regla de blacklist (service):', error);
    return { success: false, message: "No s'ha pogut eliminar la regla." };
  }

  return { success: true, message: "Regla eliminada correctament." };
}