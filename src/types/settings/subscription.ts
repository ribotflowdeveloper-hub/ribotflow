// /src/types/crm.ts (o on tinguis els teus tipus centrals)

/**
 * Representa les propietats VISUALS d'un pla de preus.
 * Aquesta és la informació que es mostra a la interfície.
 */
export type Plan = {
    id: string; // Ex: 'free', 'plus', 'premium'
    name: string;
    iconName: string;
    priceMonthly: number | null;
    priceYearly: number | null;
    description: string;
    features: string[];
    isPopular?: boolean;
    isCurrent?: boolean; // Aquesta propietat s'afegeix dinàmicament
    colors: { border: string; text: string; bg: string; hoverBg: string; }
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
    // ... altres camps de Stripe si els tens
};

// ... la resta dels teus tipus com Contact, Invoice, etc.