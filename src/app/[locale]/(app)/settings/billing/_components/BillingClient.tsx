"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation'; // ✅ 1. Importem el router
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Gift, Star, Gem, Settings} from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useTranslations, useLocale } from 'next-intl';
import { subscribeToPlanAction, cancelSubscriptionAction } from '../actions';
import type { Subscription, Plan } from '@/types/settings';

const PlanIcon = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case 'Gift': return <Gift className={className} />;
    case 'Star': return <Star className={className} />;
    case 'Gem': return <Gem className={className} />;
    case 'Settings': return <Settings className={className} />;
    default: return null;
  }
};

export function BillingClient({ plans, activeSubscription, currentUserRole }: {
  plans: Plan[];
  activeSubscription: Subscription | null;
  currentUserRole: string | null;

}) {
  const t = useTranslations('SettingsPage.billing');
  const locale = useLocale();
  const router = useRouter(); // ✅ 2. Inicialitzem el router
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isPending, startTransition] = useTransition();

  // ✅ Variable de control per a la UI basada en permisos
  const canManageBilling = currentUserRole === 'owner' || currentUserRole === 'admin';

  const currentPlanDetails = plans.find(p => p.isCurrent);
  const handleSelectPlan = (planId: string) => {
    startTransition(async () => {
      const result = await subscribeToPlanAction(planId);
      if (result.success) {
        toast.success(result.message);
        router.refresh(); // ✅ 3. Refresquem les dades de la pàgina
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleCancelSubscription = () => {
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.success) {
        toast.success(result.message);
        router.refresh(); // ✅ 3. Refresquem les dades de la pàgina
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleManageBilling = () => { toast.info(t('redirecting'), { description: t('redirectingDesc') }); };



  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <div className="flex items-center justify-center space-x-2 sm:space-x-4">
        <Label htmlFor="billing-cycle" className={cn('transition-colors text-sm sm:text-base', billingCycle === 'monthly' ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
          {t('monthlyBilling')}
        </Label>
        <Switch
          id="billing-cycle"
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <Label htmlFor="billing-cycle" className={cn('transition-colors text-sm sm:text-base', billingCycle === 'yearly' ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
          {t('yearlyBilling')} <span className="text-primary font-bold">{t('yearlySave')}</span>
        </Label>
      </div>

      {/* ✅ DISSENY ADAPTABLE: afegim 'md:grid-cols-2' per a una millor visualització en tauletes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "glass-card p-6 rounded-2xl flex flex-col relative border-2 transition-transform duration-300",
              plan.isPopular ? `${plan.colors.border} shadow-lg shadow-primary/20` : "border-transparent",
              plan.isCurrent ? "ring-2 ring-offset-2 ring-offset-background" : "lg:hover:-translate-y-2",
              plan.isCurrent ? plan.colors.border : ""
            )}
          >
            {plan.isPopular && (
              <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-full tracking-wider">
                {t('mostPopular')}
              </div>
            )}

            <div className="flex-grow flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <PlanIcon name={plan.iconName} className={cn("w-6 h-6", plan.colors.text)} />
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-6 flex-grow">{plan.description}</p>
              <div className="mb-2 min-h-[80px]">
                {plan.priceMonthly !== null ? (
                  <>
                    {/* ✅ DISSENY ADAPTABLE: Mida de font adaptable per al preu */}
                    <span className="text-4xl sm:text-5xl font-extrabold text-foreground">
                      €{billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly ? Math.round(plan.priceYearly / 12) : 0}
                    </span>
                    <span className="text-muted-foreground text-sm sm:text-base">{t('pricePerMonth')}</span>
                    {billingCycle === 'yearly' && plan.priceYearly && (
                      <p className="text-xs text-muted-foreground mt-1">{t('billedAs', { price: plan.priceYearly })}</p>
                    )}
                  </>
                ) : (
                  <span className="text-3xl sm:text-4xl font-extrabold text-foreground">{t('contactUs')}</span>
                )}
              </div>
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                // ✅ LÒGICA DE PERMISOS: El botó es desactiva si no pot gestionar la facturació
                disabled={plan.isCurrent || isPending || !canManageBilling}
                className={cn("w-full font-bold mt-2 mb-10", /* ... */)}
              >
                {plan.isCurrent ? t('yourCurrentPlan') : t('selectPlan')}
              </Button>
              <ul className="space-y-4 text-sm">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className={cn("w-4 h-4 mr-3 mt-0.5 flex-shrink-0", plan.colors.text)} />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {activeSubscription && activeSubscription.status === 'active' && currentPlanDetails && (
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="glass-card rounded-2xl border px-4 sm:px-6">
              <AccordionTrigger className="hover:no-underline text-left">
                <div className="flex items-center gap-3">
                  <PlanIcon name={currentPlanDetails.iconName} className={cn("w-6 h-6", currentPlanDetails.colors.text)} />
                  <div>
                    <p className="font-bold text-lg">{t('currentPlan', { planName: currentPlanDetails.name })}</p>
                    <p className="text-sm text-muted-foreground">{t('renewsOn', { date: new Date(activeSubscription.current_period_end).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })}. {t('clickForDetails')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm pt-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('planLabel')}</span><span className="font-semibold">{currentPlanDetails.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('statusLabel')}</span><span className="font-semibold text-green-500">{t('statusValue')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('renewalDateLabel')}</span><span className="font-semibold">{new Date(activeSubscription.current_period_end).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                </div>
                <div className="border-t mt-6 pt-6 flex flex-col sm:flex-row gap-3">
                  <Button className="w-full" onClick={handleManageBilling}>{t('manageButton')}</Button>
                  <Button variant="destructive" className="w-full" onClick={handleCancelSubscription} disabled={isPending}>{t('cancelButton')}</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </motion.div>
  );
}