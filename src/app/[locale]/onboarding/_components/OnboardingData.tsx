// /app/[locale]/onboarding/_components/OnboardingData.tsx (FITXER CORREGIT I NET)
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './OnboardingClient';

// ✅ 1. Importem el NOU servei
import * as onboardingService from '@/lib/services/onboarding/onboarding.service';

export async function OnboardingData() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }
    
    // ✅ 2. Cridem al SERVEI per obtenir les dades
    // Tota la lògica de 'Promise.all' i comprovacions s'ha mogut al servei.
    const { onboardingCompleted, availableServices, initialFullName } = 
      await onboardingService.getOnboardingData(supabase, user);

    // 3. Comprovem l'estat (lògica de visualització)
    if (onboardingCompleted) {
        return redirect('/dashboard');
    }
    
    // 4. Renderitzem el Client Component amb les dades
    return (
        <OnboardingClient 
            initialFullName={initialFullName} 
            availableServices={availableServices}
        />
    );
}