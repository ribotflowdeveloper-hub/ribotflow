// src/lib/services/settings/billing.service.ts (FITXER CORREGIT I COMPLET)
"use server";

import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { type User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// Importem el tipus de domini MANUAL (el correcte) per a Subscription
import type { Subscription as DomainSubscription } from "@/types/settings";

// ✅ 1. Importem el tipus 'Role' (el correcte) des dels permisos
// Aquest és el tipus que el 'BillingClient.tsx' espera.
import type { Role } from "@/lib/permissions/permissions.config";

// --- Tipus Públics del Servei ---

export type Subscription = DomainSubscription;

// ✅ 2. Definim TeamMemberRole utilitzant el tipus 'Role' correcte, no el 'string' generat
export type TeamMemberRole = Role;

// El que espera 'useFormState' a les Server Actions
export type FormState = {
  success: boolean;
  message: string;
};

// El que necessita la pàgina (el Server Component)
export type BillingPageData = {
  activeSubscription: Subscription | null;
  currentUserRole: TeamMemberRole | null; // ✅ Ara utilitza el tipus Role correcte
};

// ---
// ⚙️ FUNCIONS DE LECTURA (per a la pàgina)
// ---

/**
 * SERVEI: Obté les dades de facturació per a la pàgina de settings.
 */
export async function getBillingPageData(
  supabase: SupabaseClient<Database>,
  userId: string,
  teamId: string,
): Promise<BillingPageData> {
  const [subscriptionRes, memberRes] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("team_id", teamId)
      .maybeSingle(),
    supabase.from("team_members").select("role").eq("user_id", userId).eq(
      "team_id",
      teamId,
    ).single(),
  ]);

  if (subscriptionRes.error) {
    console.error(
      "Error fetching subscription (service):",
      subscriptionRes.error,
    );
  }
  if (memberRes.error) {
    console.error("Error fetching member role (service):", memberRes.error);
  }

  // Asserció de tipus per a la subscripció (de l'error anterior)
  const activeSubscription = subscriptionRes.data as Subscription | null;

  // ✅ 3. Fem l'asserció de tipus per a 'role'
  // Diem a TypeScript: "Confia, 'memberRes.data.role' (que tu creus string)
  // és en realitat del tipus 'TeamMemberRole' (l'enum)".
  const currentUserRole = (memberRes.data?.role as TeamMemberRole) || null;

  // ... (El console.log de depuració es manté igual) ...
  console.log("\n--- DEPURACIÓ DE PERMISOS (billing.service.ts) ---");
  console.log("ID de l'usuari actual:", userId);
  console.log("ID de l'equip actiu:", teamId);
  console.log("Rol de l'usuari detectat:", currentUserRole);
  console.log("-------------------------------------------------\n");

  return { activeSubscription, currentUserRole };
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (per a les Server Actions)
// ---

/**
 * SERVEI: Subscriu un equip a un pla.
 */
export async function subscribeToPlan(
  supabase: SupabaseClient<Database>,
  user: User,
  teamId: string,
  planId: string,
): Promise<FormState> {
  // Aquesta funció no retorna el rol, es manté igual que abans
  try {
    // ✅ CORRECCIÓ: Definim les dates d'inici i fi del cicle
    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.setMonth(now.getMonth() + 1)).toISOString(); // Suposem cicles d'1 mes

    await supabase
      .from("subscriptions")
      .upsert({
        team_id: teamId,
        plan_id: planId,
        status: "active",
        // ✅ AFEGIM LA NOVA DATA D'INICI
        current_period_start: periodStart,
        current_period_end: periodEnd,
      }, { onConflict: "team_id" })
      .throwOnError();

    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { app_metadata: { ...user.app_metadata, active_team_plan: planId } },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Error en subscriure's al pla.";
    console.error("Error subscribeToPlan (service):", message);
    return { success: false, message };
  }

  return {
    success: true,
    message: `Subscripció al pla '${planId}' realitzada!`,
  };
}

/**
 * SERVEI: Cancel·la una subscripció.
 */
export async function cancelSubscription(
  supabase: SupabaseClient<Database>,
  user: User,
  teamId: string,
): Promise<FormState> {
  // 1. Comprovació de permisos (lògica de negoci)
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("team_id", teamId)
    .single();

  // ✅ 4. Afegim asserció de tipus també aquí per a la comprovació
  const userRole = member?.role as TeamMemberRole | null;

  if (userRole !== "owner") {
    return {
      success: false,
      message: "Només el propietari de l'equip pot cancel·lar la subscripció.",
    };
  }

  // 2. Execució de la lògica (es manté igual)
try {
    // ✅ CORRECCIÓ: En cancel·lar, posem el pla a 'free'
    // i nul·lifiquem les dates del cicle de pagament.
    await supabase
      .from('subscriptions')
      .update({ 
        status: 'canceled', 
        plan_id: 'plan_free',
        current_period_start: undefined,
        current_period_end: undefined
      })
      .eq('team_id', teamId)
      .throwOnError();

    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { app_metadata: { ...user.app_metadata, active_team_plan: "free" } },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Error en cancel·lar la subscripció.";
    console.error("Error cancelSubscription (service):", message);
    return { success: false, message };
  }

  return { success: true, message: "Subscripció cancel·lada." };
}
