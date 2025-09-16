/**
 * @file BillingClient.tsx
 * @summary Aquest fitxer conté el component de client que gestiona tota la interfície interactiva
 * de la pàgina de Facturació i Plans. S'encarrega de mostrar els plans disponibles,
 * gestionar el canvi entre facturació mensual i anual, i mostrar la informació del pla actual de l'usuari.
 */

"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Gift, Star, Gem, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

// Definim el tipus de dades per a un pla.
type Plan = {
  id: string; // ✅ AFEGEIX AQUESTA LÍNIA
  name: string;
  iconName: string; // Passem el nom de la icona en lloc del component per a una millor serialització.
  priceMonthly: number | null;
  priceYearly: number | null;
  description: string;
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  colors: { border: string; text: string; bg: string; hoverBg: string; }
};

/** @summary Un component d'ajuda per renderitzar la icona correcta basant-se en el seu nom. */
const PlanIcon = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case 'Gift': return <Gift className={className} />;
    case 'Star': return <Star className={className} />;
    case 'Gem': return <Gem className={className} />;
    case 'Settings': return <Settings className={className} />;
    default: return null;
  }
};

export function BillingClient({ plans }: { plans: Plan[] }) {
  const t = useTranslations('SettingsPage.billing');
  const locale = useLocale();
  // Estat per controlar si la vista és mensual o anual.
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Trobem el pla actual de l'usuari a partir de les dades rebudes.
  const currentPlan = plans.find(p => p.isCurrent);

  const renewalDate = new Date();
  renewalDate.setDate(new Date().getDate() + 21); // Data de renovació simulada.

  // Gestors d'esdeveniments. Actualment mostren notificacions, ja que la integració amb Stripe no està implementada.
  const handleSelectPlan = (planName: string) => { toast.info(t('notImplemented'), { description: t('notImplementedDesc', { planName }) }); };
  const handleManageBilling = () => { toast.info(t('redirecting'), { description: t('redirectingDesc') }); };
  const handleCancelSubscription = () => { toast.error(t('cancellationPage'), { description: t('cancellationDesc') }); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">

     

      <div className="flex items-center justify-center space-x-4">
        <Label htmlFor="billing-cycle" className={cn('transition-colors', billingCycle === 'monthly' ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
          {t('monthlyBilling')}
        </Label>
        <Switch
          id="billing-cycle"
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <Label htmlFor="billing-cycle" className={cn('transition-colors', billingCycle === 'yearly' ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
          {t('yearlyBilling')} <span className="text-primary font-bold">{t('yearlySave')}</span></Label>

      </div>

      {/* ✅ DISSENY MILLORAT: 'items-stretch' fa que totes les targetes tinguin la mateixa alçada */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch">
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

            {/* ✅ DISSENY MILLORAT: Aquest 'div' creix per empènyer el botó cap avall */}
            <div className="flex-grow flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <PlanIcon name={plan.iconName} className={cn("w-6 h-6", plan.colors.text)} />
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
              </div>

              <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

              <div className="mb-2 min-h-[80px]">
                {plan.priceMonthly !== null ? (
                  <>
                    <span className="text-5xl font-extrabold text-foreground">
                      €{billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly ? Math.round(plan.priceYearly / 12) : 0}
                    </span>
                    <span className="text-muted-foreground">{t('pricePerMonth')}</span>                    
                    {billingCycle === 'yearly' && plan.priceYearly && (
                      <p className="text-xs text-muted-foreground mt-1">{t('billedAs', { price: plan.priceYearly })}</p>
                    )}
                  </>
                ) : (
                  <span className="text-4xl font-extrabold text-foreground">{t('contactUs')}</span>
                )}
              </div>
              <Button
                onClick={() => handleSelectPlan(plan.name)}
                disabled={plan.isCurrent}
                className={cn(
                  "w-full font-bold mt-2 mb-10", // Marge superior per separar-lo de la llista
                  plan.isCurrent ? `${plan.colors.bg} text-white` : `bg-transparent border-2 ${plan.colors.border} ${plan.colors.text} ${plan.colors.hoverBg} hover:text-white`
                )}
              >
                {plan.isCurrent ? t('yourCurrentPlan') : plan.priceMonthly !== null ? t('selectPlan') : t('contactSales')}
                </Button>
              {/* ✅ DISSENY MILLORAT: La llista de funcionalitats ara ocupa l'espai restant */}
              <ul className="space-y-4 text-sm flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className={cn("w-4 h-4 mr-3 mt-0.5 flex-shrink-0", plan.colors.text)} />
                    {/* ✅ DISSENY MILLORAT: Text més clar per a millor llegibilitat */}
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            


          </div>
        ))}
      </div>
      {currentPlan && (
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="glass-card rounded-2xl border px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <PlanIcon name={currentPlan.iconName} className={cn("w-6 h-6", currentPlan.colors.text)} />
                  <div>
                    <p className="font-bold text-lg text-left">{t('currentPlan', { planName: currentPlan.name })}</p>
                    <p className="text-sm text-muted-foreground text-left">{t('renewsOn', { date: renewalDate.toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })}. {t('clickForDetails')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('planLabel')}</span>
                    <span className="font-semibold">{currentPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('statusLabel')}</span>
                    <span className="font-semibold text-green-500">{t('statusValue')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('renewalDateLabel')}</span>
                    <span className="font-semibold">{renewalDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="border-t mt-6 pt-6 flex flex-col sm:flex-row gap-3">
                  <Button className="w-full" onClick={handleManageBilling}>{t('manageButton')}</Button>
                  <Button variant="destructive" className="w-full" onClick={handleCancelSubscription}>{t('cancelButton')}</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </motion.div>
  );
}

