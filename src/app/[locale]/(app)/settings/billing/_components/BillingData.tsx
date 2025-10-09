import { BillingClient } from './BillingClient';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { Subscription, Plan } from '@/types/settings';
import { plansStructure } from '@/config/billing';



export async function BillingData() {
    const t = await getTranslations('SettingsPage.billing');
    const supabase = createClient(cookies());

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');
    
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return redirect('/settings/team');
    }

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