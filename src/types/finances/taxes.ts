// --- 2. MODIFICACIONS ALS TIPUS EXISTENTS ---
// Representa un impost del nostre catàleg (la taula 'tax_rates')
export type TaxRate = {
  id: string; // uuid
  team_id: string; // uuid
  name: string;
  rate: number;
  type: 'vat' | 'retention';
  is_default: boolean;
  percentage: number;
};

// Representa l'impost DESAT (la taula 'expense_item_taxes')
export type ItemTax = {
  id: string; // uuid
  team_id: string; // uuid
  expense_item_id: string; // uuid
  tax_rate_id: string; // uuid
  name: string;
  rate: number;
  amount: number;
};

