"use server";

import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { OnboardingSchema, type OnboardingFormData } from './schema';

// 🔹 Tipus auxiliars
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
// 1️⃣ FUNCIÓ DE LECTURA DE DADES
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
// 2️⃣ FUNCIÓ DE MUTACIÓ (RPC)
// ---
export async function submitOnboarding(
  supabase: SupabaseClient<Database>,
  user: User,
  formData: OnboardingFormData
): Promise<FormState> {

  // Validació amb Zod
  const validationResult = OnboardingSchema.safeParse(formData);
  if (!validationResult.success) {
    return { success: false, message: validationResult.error.issues[0].message };
  }

  const validData = validationResult.data;

  // Paràmetres per a la RPC
  const rpcParams = {
    p_user_id: user.id,
    p_full_name: validData.full_name,
    p_email: user.email!,
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
    p_longitude: validData.longitude !== undefined ? validData.longitude : undefined,
  };

  try {
    const { error } = await supabase.rpc('handle_onboarding', rpcParams);
    if (error) throw error;

    return { success: true, message: "Onboarding completat!" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hi ha hagut un error desconegut.";
    console.error("Error durant la RPC d'Onboarding:", message);
    return { success: false, message: "No s'ha pogut completar el registre. Intenta-ho de nou." };
  }
}
