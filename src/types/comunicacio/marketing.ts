// Ubicació: src/types/marketing/types.ts

import type { Database } from '@/types/supabase'; // Assumim que aquest és el camí correcte

// --- Tipus de Base de Dades (DRY) ---
// Derivat directament de la BBDD. Aquesta és la font de veritat.
export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];
export type CampaignUpdate = Database['public']['Tables']['campaigns']['Update'];

// --- Tipus de Lògica de Negoci (IA) ---
// Aquest és un tipus per a la lògica de negoci, no de la BBDD.
export interface Strategy {
  name: string;
  type: string;
  target_audience: string;
  description: string;
}

export type Kpis = {
  totalLeads: number;
  conversionRate: number;
};

// Tipus compost que defineix el que l'RPC 'get_marketing_page_data' retorna
export type MarketingPageData = {
  kpis: Kpis;
  campaigns: Campaign[]; // Reutilitzem el tipus Campaign!
};