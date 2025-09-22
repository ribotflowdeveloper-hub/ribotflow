/**
 * @file BillingData.tsx
 * @summary Component de Servidor que carrega les dades per a la pàgina de facturació.
 */
import { BillingClient } from './BillingClient';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

// Estructura base dels plans (dades no traduïbles).
const plansStructure = [
  { id: 'free', name: 'Free', iconName: 'Gift', priceMonthly: 0, priceYearly: 0, colors: { border: "border-muted", text: "text-muted-foreground", bg: "bg-muted", hoverBg: "hover:bg-muted/80" } },
  { id: 'plus', name: 'Plus', iconName: 'Star', priceMonthly: 29, priceYearly: 290, isPopular: true, colors: { border: "border-primary", text: "text-primary", bg: "bg-primary", hoverBg: "hover:bg-primary/90" } },
  { id: 'premium', name: 'Premium', iconName: 'Gem', priceMonthly: 79, priceYearly: 790, colors: { border: "border-teal-500", text: "text-teal-500", bg: "bg-teal-500", hoverBg: "hover:bg-teal-500/90" } },
  { id: 'custom', name: 'Personalitzat', iconName: 'Settings', priceMonthly: null, priceYearly: null, colors: { border: "border-foreground", text: "text-foreground", bg: "bg-foreground", hoverBg: "hover:bg-foreground/90" } },
];

export async function BillingData() {
    const t = await getTranslations('SettingsPage.billing');
    const cookieStore = cookies();
    const supabase = createClient(cookies())
;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Simulem que la base de dades retorna l'identificador del pla de l'usuari.
    const userPlanName = "Plus"; 

    // Construïm les dades finals dels plans combinant l'estructura base amb les traduccions.
    const finalPlansData = plansStructure.map(plan => {
      const planName = plan.id === 'custom' ? t(`plans.${plan.id}.name`) : plan.name;
      return {
        ...plan,
        name: planName,
        description: t(`plans.${plan.id}.description`),
        features: t.raw(`plans.${plan.id}.features`),
        isCurrent: plan.name === userPlanName,
      }
    });

    return (
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
        <p className="text-muted-foreground mb-8">{t('pageDescription')}</p>
        <BillingClient plans={finalPlansData} />
      </div>
    );
}