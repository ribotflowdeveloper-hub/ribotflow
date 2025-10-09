import type { PlanConfig } from '@/types/settings';

/**
 * Configuració centralitzada dels plans de subscripció.
 * * NOTA: En un projecte real, els IDs i preus haurien de venir de variables d'entorn
 * per a gestionar fàcilment els entorns de desenvolupament, proves i producció.
 * * Exemple al teu fitxer `.env.local`:
 * PLAN_PLUS_ID=price_xxxxxxxxxx
 * PLAN_PREMIUM_ID=price_yyyyyyyyyy
 */
export const plansStructure: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    iconName: 'Gift',
    priceMonthly: 0,
    priceYearly: 0,
    colors: { border: "border-muted", text: "text-muted-foreground", bg: "bg-muted", hoverBg: "hover:bg-muted/80" }
  },
  {
    id: process.env.PLAN_PLUS_ID || 'plus',
    name: 'Plus',
    iconName: 'Star',
    priceMonthly: 29,
    priceYearly: 290,
    isPopular: true,
    colors: { border: "border-primary", text: "text-primary", bg: "bg-primary", hoverBg: "hover:bg-primary/90" }
  },
  {
    id: process.env.PLAN_PREMIUM_ID || 'premium',
    name: 'Premium',
    iconName: 'Gem',
    priceMonthly: 79,
    priceYearly: 790,
    colors: { border: "border-teal-500", text: "text-teal-500", bg: "bg-teal-500", hoverBg: "hover:bg-teal-500/90" }
  },
  {
    id: 'custom',
    name: 'Personalitzat',
    iconName: 'Settings',
    priceMonthly: null,
    priceYearly: null,
    colors: { border: "border-foreground", text: "text-foreground", bg: "bg-foreground", hoverBg: "hover:bg-foreground/90" }
  },
];
