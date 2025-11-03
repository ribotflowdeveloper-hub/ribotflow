// src/types/finances/quotes.ts
// (O src/types/crm/quotes.ts, depenent d'on el posis. Assegura't que l'import al service coincideixi)

import { type Database, type Tables } from '@/types/supabase';
import { type PaginatedResponse } from '@/hooks/usePaginateResource'; // ✅ Assegura't que aquí posa 'from'

// --- Tipus Base (Font de la Veritat) ---
export type Quote = Tables<'quotes'>;
export type QuoteId = Quote["id"];
export type QuoteStatus = Database["public"]["Enums"]["quote_status"]; 

// --- Tipus de la Funció RPC (Contracte Manual) ---
// Aquest és el tipus que la BD retorna de la funció 'search_paginated_quotes'
// INCLOU camps de la taula 'quotes' + camps extra (currency, language, joins, etc.)
export interface RpcQuoteRow {
  id: QuoteId;
  quote_number: string | null;
  issue_date: string;
  expiry_date: string | null;
  total: number | null;
  status: QuoteStatus;
  contact_id: number | null;
  currency: string | null; // ✅ Aquest camp NO està a Tables<'quotes'>
  terms: string | null; // ✅ Aquest camp NO està a Tables<'quotes'>
  language: string | null; // ✅ Aquest camp NO està a Tables<'quotes'>
  created_at: string;
  updated_at: string | null;
  subtotal: number | null;
  tax_percent: number | null;
  show_quantity: boolean | null;
  discount: number | null;
  tax: number | null;
  opportunity_id: number | null;
  send_at: string | null;
  secure_id: string | null;
  sent_at: string | null;
  notes: string | null;
  rejection_reason: string | null;
  theme_color: string | null;
  sequence_number: number | null;
  user_id: string;
  team_id: string;
  verifactu_uuid: string | null;
  
  // Camps del JOIN
  contact_nom: string | null;
  contact_empresa: string | null;
  
  // Camp Calculat
  total_count: number;
}

// --- Tipus Enriquit per la UI (El "View Model") ---
// Aquest és el tipus que el client (QuotesClient) espera.
// És el resultat de 'mapRpcRowToQuote'.
// Fem servir Omit per treure els camps del contacte (que re-mapejarem) i el comptador.
export type QuoteWithContact = Omit<RpcQuoteRow, 'contact_nom' | 'contact_empresa' | 'total_count'> & {
  contacts: {
    id: number;
    nom: string;
    empresa: string | null;
  } | null;
};

// --- Tipus per a Filtres i Paginació ---
export interface QuotePageFilters {
  status: QuoteStatus | "all";
}
export type PaginatedQuotesData = PaginatedResponse<QuoteWithContact>;



// --- Tipus addicionals per a l'Editor [id] ---

export type QuoteItem = Tables<'quote_items'>;
export type Product = Tables<'products'>;
export type Team = Tables<'teams'>;
export type Opportunity = Tables<'opportunities'>;
export type Contact = Tables<'contacts'>;

/**
 * El payload que la RPC 'upsert_quote_with_items' espera.
 * Definit a 'actions.ts'
 */
export type QuotePayload = Partial<Omit<Quote, "id">> & {
  id: "new" | number;
  items: Partial<QuoteItem>[];
};

/**
 * El tipus de dades que retorna la RPC 'get_quote_details'
 * Definit a 'QuoteEditorData.tsx'
 */
export type QuoteDetailsResponse = {
  quote: (Quote & { items: QuoteItem[] }) | null; // Pot ser null si no es troba
  opportunities: Opportunity[];
}

/**
 * Tipus per a un nou pressupost que encara no té ID a la BD
 * Definit a 'QuoteEditorData.tsx'
 */
export type NewQuote = Omit<Quote, 'id'> & { id: 'new'; items: Partial<QuoteItem>[] };

/**
 * Tipus unió per al pressupost inicial (nou o existent)
 * Definit a 'QuoteEditorData.tsx'
 */
export type InitialQuoteType = (Quote & { items: QuoteItem[] }) | NewQuote;

/**
 * Tipus de dades agregades que el servei 'getQuoteEditorData' retornarà
 * al Server Component 'QuoteEditorData.tsx'.
 */
export type QuoteEditorDataPayload = {
    initialQuote: InitialQuoteType;
    contacts: Contact[];
    products: Product[];
    companyProfile: Team | null;
    initialOpportunities: Opportunity[];
    pdfUrl: string | null;
}