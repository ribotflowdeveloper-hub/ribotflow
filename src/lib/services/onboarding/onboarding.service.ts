// src/lib/services/onboarding.service.ts (FITXER REFACTORITZAT)
"use server";

import { z } from 'zod';
import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
// ❌ Ja no necessitem 'createAdminClient' aquí

// ---
// 1. ESQUEMA I TIPUS (Es mantenen igual)
// ---
export const OnboardingSchema = z.object({
  full_name: z.string().min(3, "El nom complet és obligatori."),
  company_name: z.string().min(2, "El nom de l'empresa és obligatori."),
  tax_id: z.string().optional(),
  website: z.string().url("Introdueix una URL vàlida.").optional().or(z.literal('')),
  summary: z.string().optional(),
  sector: z.string().optional(),
  services: z.array(z.string()).min(1, "Has de seleccionar almenys un servei."),
  phone: z.string().optional(),
  street: z.string().min(1, "El carrer és obligatori."),
  city: z.string().min(1, "La ciutat és obligatòria."),
  postal_code: z.string().min(1, "El codi postal és obligatori."),
  region: z.string().min(1, "La regió és obligatòria."),
  country: z.string().min(1, "El país és obligatori."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type OnboardingFormData = z.infer<typeof OnboardingSchema>;
// ... (els tipus OnboardingData i FormState es mantenen igual)
type AvailableService = { id: number; name: string };
export type OnboardingData = {
  onboardingCompleted: boolean;
  availableServices: AvailableService[];
  initialFullName: string;
};
export type FormState = {
  success: boolean;
  message: string;
};

// ---
// 2. FUNCIÓ DE LECTURA DE DADES (Lògica de 'OnboardingData.tsx')
// ---

export async function getOnboardingData(
  supabase: SupabaseClient<Database>,
  user: User
): Promise<OnboardingData> {
  
  const [profileRes, servicesRes] = await Promise.all([
    supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single(),
    supabase.from('services').select('id, name').order('name')
  ]);

  if (servicesRes.error) {
    console.error("Error al carregar els serveis:", servicesRes.error);
  }

  return {
    onboardingCompleted: profileRes.data?.onboarding_completed || false,
    availableServices: servicesRes.data || [],
    initialFullName: user.user_metadata?.full_name || ''
  };
}

// ---
// 3. FUNCIÓ DE MUTACIÓ (REFACTORITZADA A RPC)
// ---
export async function submitOnboarding(
  supabase: SupabaseClient<Database>,
  user: User,
  formData: OnboardingFormData
): Promise<FormState> {
  
  // 1. Validació de dades amb Zod
  const validationResult = OnboardingSchema.safeParse(formData);
  if (!validationResult.success) {
    return { success: false, message: validationResult.error.issues[0].message };
  }
  
  const validData = validationResult.data;

  // 2. Preparació dels paràmetres per a la RPC
  const rpcParams = {
    p_user_id: user.id,
    p_full_name: validData.full_name,
    p_email: user.email!, // L'usuari ha d'existir, per tant l'email també
    p_company_name: validData.company_name,
    p_tax_id: validData.tax_id ?? '',
    p_website: validData.website ?? '',
    p_summary: validData.summary ?? '',
    p_sector: validData.sector ?? '',
    p_services: validData.services,
    p_phone: validData.phone ?? '',
    p_street: validData.street,
    p_city: validData.city,
    p_postal_code: validData.postal_code,
    p_region: validData.region,
    p_country: validData.country,
    p_latitude: validData.latitude !== undefined ? validData.latitude : undefined,
    p_longitude: validData.longitude !== undefined ? validData.longitude : undefined
  };

  try {
    // 3. ✅ CRIDA ÚNICA I TRANSACCIONAL A LA BBDD
    const { error } = await supabase.rpc('handle_onboarding', rpcParams);

    if (error) throw error; // Si la RPC falla, llançarà una excepció

    // 4. Èxit
    return { success: true, message: "Onboarding completat!" };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Hi ha hagut un error desconegut.";
    console.error("Error durant la RPC d'Onboarding:", message);
    return { success: false, message: "No s'ha pogut completar el registre. Intenta-ho de nou." };
  }
}