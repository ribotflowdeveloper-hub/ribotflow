import { BillingClient } from './BillingClient';
import { getTranslations } from 'next-intl/server';
import type { Subscription, Plan } from '@/types/settings';
import { validatePageSession } from '@/lib/supabase/session'; // ✅ 1. Importem l'assistent de sessió
import { plansStructure } from '@/config/billing';


export async function BillingData() {
    const t = await getTranslations('SettingsPage.billing');
       // ✅ 1. Validació de sessió neta i centralitzada
    const { supabase, user, activeTeamId } = await validatePageSession();

    const [subscriptionRes, memberRes] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('team_id', activeTeamId).maybeSingle(),
        supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single()
    ]);
    
    const activeSubscription = subscriptionRes.data;
    const currentUserRole = memberRes.data?.role || null;

    // ✅ TRAMPA DE DEPURACIÓ
    console.log("\n--- DEPURACIÓ DE PERMISOS (BillingData.tsx) ---");
    console.log("ID de l'usuari actual:", user.id);
    console.log("ID de l'equip actiu:", activeTeamId);
    console.log("Resultat de la consulta de rol (memberRes):", JSON.stringify(memberRes, null, 2));
    console.log("Rol de l'usuari detectat:", currentUserRole);
    console.log("----------------------------------------------\n");

    const finalPlansData: Plan[] = plansStructure.map(plan => ({
        ...plan,
        name: plan.id === 'custom' ? t(`plans.${plan.id}.name`) : plan.name,
        description: t(`plans.${plan.id}.description`),
        features: t.raw(`plans.${plan.id}.features`),
        isCurrent: activeSubscription?.status === 'active' && activeSubscription.plan_id === plan.id,
    }));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
            <p className="text-muted-foreground mb-8">{t('pageDescription')}</p>
            <BillingClient 
                plans={finalPlansData} 
                activeSubscription={activeSubscription as Subscription | null}
                currentUserRole={currentUserRole}
            />
        </div>
    );
}