import { BillingClient } from './BillingClient';
import { getTranslations } from 'next-intl/server';
import type { Subscription, Plan } from '@/types/settings';
import { validatePageSession } from '@/lib/supabase/session'; // ✅ 1. Importem l'assistent de sessió

const plansStructure = [
    { id: 'free', name: 'Free', iconName: 'Gift', priceMonthly: 0, priceYearly: 0, colors: { border: "border-muted", text: "text-muted-foreground", bg: "bg-muted", hoverBg: "hover:bg-muted/80" } },
    { id: 'plus', name: 'Plus', iconName: 'Star', priceMonthly: 29, priceYearly: 290, isPopular: true, colors: { border: "border-primary", text: "text-primary", bg: "bg-primary", hoverBg: "hover:bg-primary/90" } },
    { id: 'premium', name: 'Premium', iconName: 'Gem', priceMonthly: 79, priceYearly: 790, colors: { border: "border-teal-500", text: "text-teal-500", bg: "bg-teal-500", hoverBg: "hover:bg-teal-500/90" } },
    { id: 'custom', name: 'Personalitzat', iconName: 'Settings', priceMonthly: null, priceYearly: null, colors: { border: "border-foreground", text: "text-foreground", bg: "bg-foreground", hoverBg: "hover:bg-foreground/90" } },
];

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