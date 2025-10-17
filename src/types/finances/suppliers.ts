// src/types/finances/suppliers.ts

/**
 * Representa l'estructura completa d'un proveïdor, tal com està a la base de dades.
 */
export interface Supplier {
  id: string; // Correspon al tipus 'uuid' de Supabase
  user_id: string;
  team_id: string;
  nom: string;
  email?: string | null;
  telefon?: string | null;
  nif?: string | null;
  created_at: string; // Correspon al tipus 'timestamp with time zone'
}

/**
 * Un tipus més simple per a llistes o selectors, per optimitzar les dades que es transfereixen.
 */
export type SupplierForSelector = Pick<Supplier, 'id' | 'nom'>;