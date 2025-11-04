// src/app/[locale]/(app)/settings/billing/_components/BillingData.tsx (FITXER CORREGIT I NET)
import { BillingClient } from './BillingClient';
import { getTranslations } from 'next-intl/server';
import { validatePageSession } from '@/lib/supabase/session';
import { plansStructure } from '@/config/billing';

// ✅ 1. Importem el NOU servei i els seus tipus
import * as billingService from '@/lib/services/settings/billing/billing.service';
import type { Plan } from '@/types/settings'; // Aquest tipus 'Plan' és de UI, està bé aquí

export async function BillingData() {
  const t = await getTranslations('SettingsPage.billing');
  
  // ✅ 2. Validació de sessió neta
  const { supabase, user, activeTeamId } = await validatePageSession();

  // ✅ 3. Crida al SERVEI per obtenir dades
  // Tota la lògica de 'Promise.all' i consultes s'ha mogut al servei.
  const { activeSubscription, currentUserRole } = await billingService.getBillingPageData(
    supabase,
    user.id,
    activeTeamId
  );

  // 4. Lògica de presentació (mapa de traduccions)
  // Això és correcte que estigui aquí, ja que és lògica de la UI (i18n).
  const finalPlansData: Plan[] = plansStructure.map(plan => ({
    ...plan,
    name: plan.id === 'custom' ? t(`plans.${plan.id}.name`) : plan.name,
    description: t(`plans.${plan.id}.description`),
    features: t.raw(`plans.${plan.id}.features`),
    isCurrent: activeSubscription?.status === 'active' && activeSubscription.plan_id === plan.id,
  }));

  // 5. Renderitzat del Client Component
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
      <p className="text-muted-foreground mb-8">{t('pageDescription')}</p>
      <BillingClient 
        plans={finalPlansData} 
        activeSubscription={activeSubscription} // El tipus ja és 'Subscription | null'
        currentUserRole={currentUserRole}       // El tipus ja és 'TeamMemberRole | null'
      />
    </div>
  );
}