import type { PlanConfig } from '@/types/settings';

/**
 * Configuració centralitzada dels plans de subscripció.
 * El camp 'name' s'utilitzarà com a clau per a les traduccions (en minúscules).
 */
export const plansStructure: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free', // Aquesta serà la clau 'free' per a les traduccions
    iconName: 'Gift',
    priceMonthly: 0,
    priceYearly: 0,
    colors: { border: "border-muted", text: "text-muted-foreground", bg: "bg-muted", hoverBg: "hover:bg-muted/80" }
  },
  {
    id: process.env.PLAN_PLUS_ID || 'plus',
    name: 'Plus', // Aquesta serà la clau 'plus' per a les traduccions
    iconName: 'Star',
    priceMonthly: 29,
    priceYearly: 290,
    isPopular: true,
    colors: { border: "border-primary", text: "text-primary", bg: "bg-primary", hoverBg: "hover:bg-primary/90" }
  },
  {
    id: process.env.PLAN_PREMIUM_ID || 'premium',
    name: 'Premium', // Aquesta serà la clau 'premium' per a les traduccions
    iconName: 'Gem',
    priceMonthly: 79,
    priceYearly: 790,
    colors: { border: "border-teal-500", text: "text-teal-500", bg: "bg-teal-500", hoverBg: "hover:bg-teal-500/90" }
  },
  {
    id: 'custom',
    name: 'Custom', // Aquesta serà la clau 'custom' per a les traduccions
    iconName: 'Settings',
    priceMonthly: null,
    priceYearly: null,
    colors: { border: "border-foreground", text: "text-foreground", bg: "bg-foreground", hoverBg: "hover:bg-foreground/90" }
  },
];

