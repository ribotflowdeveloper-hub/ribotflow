// /app/[locale]/onboarding/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Importem el NOU servei i els seus tipus
import * as onboardingService from '@/lib/services/onboarding/onboarding.service';
import type { OnboardingFormData } from '@/lib/services/onboarding/schema';

export async function submitOnboardingAction(formData: OnboardingFormData) {
    // --- PAS 1: INICIALITZACIÓ I AUTENTICACIÓ ---
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }

    // --- PAS 2: CRIDA AL SERVEI ---
    // Tota la lògica de validació, BBDD, pipeline i auth està ara al servei.
    const result = await onboardingService.submitOnboarding(supabase, user, formData);

    if (result.success === false) {
      return result; // Retornem l'error al client
    }

    // --- PAS 3: REDIRECCIÓ SI TOT HA ANAT BÉ ---
    await supabase.auth.refreshSession();
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';
    redirect(`/${locale}/dashboard`);
}