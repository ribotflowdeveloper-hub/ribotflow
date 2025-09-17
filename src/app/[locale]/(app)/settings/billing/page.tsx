/**
 * @file page.tsx (Billing)
 * @summary Component de Servidor per a la pàgina de Facturació, amb la lògica de traducció correcta.
 * ✅ SOLUCIÓ DEFINITIVA: Utilitzem 'await params' per a una màxima compatibilitat amb Next.js.
 */

import { BillingClient } from './_components/BillingClient';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

// Definim el tipus correcte per a les props, indicant que params pot ser una Promise.
type BillingPageProps = {
    params: { locale: string } | Promise<{ locale: string }>;
};

/**
 * @summary Genera les metadades de la pàgina de manera dinàmica i traduïda.
 */
export async function generateMetadata({ params }: BillingPageProps): Promise<Metadata> {
  // ✅ CORRECCIÓ CLAU: Esperem (await) la promesa per obtenir els paràmetres reals.
  // Això assegura que sempre tenim el valor correcte abans de continuar.
  const { locale } = await params; 
  const t = await getTranslations({ locale, namespace: 'SettingsPage.billing' });

  return {
    title: `${t('metaTitle')} | Ribot`,
  };
}

const plansStructure = [
  { 
    id: 'free', name: 'Free', iconName: 'Gift', priceMonthly: 0, priceYearly: 0, 
    colors: { border: "border-muted", text: "text-muted-foreground", bg: "bg-muted", hoverBg: "hover:bg-muted/80" }
  },
  { 
    id: 'plus', name: 'Plus', iconName: 'Star', priceMonthly: 29, priceYearly: 290, isPopular: true, 
    colors: { border: "border-primary", text: "text-primary", bg: "bg-primary", hoverBg: "hover:bg-primary/90" }
  },
  { 
    id: 'premium', name: 'Premium', iconName: 'Gem', priceMonthly: 79, priceYearly: 790, 
    colors: { border: "border-teal-500", text: "text-teal-500", bg: "bg-teal-500", hoverBg: "hover:bg-teal-500/90" }
  },
  { 
    id: 'custom', name: 'Personalitzat', iconName: 'Settings', priceMonthly: null, priceYearly: null, 
    colors: { border: "border-foreground", text: "text-foreground", bg: "bg-foreground", hoverBg: "hover:bg-foreground/90" }
  },
];

/**
 * @function BillingPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function BillingPage({ params }: BillingPageProps) {
    const { locale } = await params; // ✅ CORRECCIÓ CLAU: Apliquem la mateixa solució aquí.
    const t = await getTranslations({ locale, namespace: 'SettingsPage.billing' });
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/${locale}/login`);
    }
    
    const userPlanName = "Plus"; 

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

