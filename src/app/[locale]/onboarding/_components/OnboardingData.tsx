// /app/[locale]/onboarding/_components/OnboardingData.tsx

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './OnboardingClient';

export async function OnboardingData() {
    const supabase = createClient(); // La teva funció ja gestiona les cookies

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }
    
    // ✅ Executem les dues consultes alhora per més rapidesa
    const [profileRes, servicesRes] = await Promise.all([
        supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single(),
        supabase.from('services').select('id, name').order('name')
    ]);

    // Comprovem el resultat del perfil
    if (profileRes.data?.onboarding_completed) {
        return redirect('/dashboard');
    }

    // Comprovem si hi ha hagut un error en carregar els serveis
    if (servicesRes.error) {
        console.error("Error al carregar els serveis:", servicesRes.error);
    }
    
    const initialFullName = user.user_metadata?.full_name || '';
    const availableServices = servicesRes.data || [];

    return (
        <OnboardingClient 
            initialFullName={initialFullName} 
            availableServices={availableServices}
        />
    );
}