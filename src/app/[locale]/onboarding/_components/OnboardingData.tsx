// /app/[locale]/onboarding/_components/OnboardingData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './OnboardingClient';

export async function OnboardingData() {
    const supabase = createClient(cookies());

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }
    
    // ✅ NOVA COMPROVACIÓ DE SEGURETAT
    // Si l'usuari ja ha completat l'onboarding, no el deixem tornar a entrar aquí.
    // El redirigim al dashboard, on la lògica principal decidirà què fer.
    const { data: profile } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single();
    if (profile?.onboarding_completed) {
        return redirect('/dashboard');
    }

    // La teva lògica original per a obtenir el nom es queda igual
    const initialFullName = user.user_metadata?.full_name || '';

    

    return <OnboardingClient initialFullName={initialFullName} />;
}