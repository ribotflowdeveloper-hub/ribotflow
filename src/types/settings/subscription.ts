/**
 * Representa la configuració ESTÀTICA d'un pla de preus,
 * tal com es defineix al fitxer de configuració.
 */
export type PlanConfig = {
  id: string; // ID del producte (ex: 'plus', 'price_xxxx')
  name: string; // Nom clau per a traduccions (ex: 'Plus', 'Premium')
  iconName: 'Gift' | 'Star' | 'Gem' | 'Settings';
  priceMonthly: number | null;
  priceYearly: number | null;
  isPopular?: boolean;
  colors: { border: string; text: string; bg: string; hoverBg: string; }
};

/**
 * Representa les propietats d'un pla LLestes per ser mostrades a la UI.
 * Estén la configuració base amb dades dinàmiques com traduccions i l'estat actual.
 */
export type Plan = PlanConfig & {
  description: string;
  features: string[];
  isCurrent?: boolean;
};

/**
 * Representa la subscripció d'un EQUIP guardada a la base de dades.
 */
export type Subscription = {
  id: string;
  team_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'canceled';
  current_period_end: string; // Data en format ISO string
};
