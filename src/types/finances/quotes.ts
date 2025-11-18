// src/types/finances/quotes.ts
// (O src/types/crm/quotes.ts, depenent d'on el posis. Assegura't que l'import al service coincideixi)

import { type Database, type Tables } from '@/types/supabase';
import { type PaginatedResponse } from '@/hooks/usePaginateResource'; // ✅ Assegura't que aquí posa 'from'
import { type TaxRate } from '@/types/finances/index';
// --- Tipus Base (Font de la Veritat) ---
export type Quote = Tables<'quotes'>;
export type QuoteId = Quote["id"];
export type QuoteStatus = Database["public"]["Enums"]["quote_status"]; 
export type QuoteRow = Database['public']['Tables']['quotes']['Row'];
export type ContactRow = Database['public']['Tables']['contacts']['Row'];
export type TeamRow = Database['public']['Tables']['teams']['Row'];
export type Product = Tables<'products'>;
export type Team = Tables<'teams'>;
export type Opportunity = Tables<'opportunities'>;
export type Contact = Tables<'contacts'>;
export type QuoteItemTax = Tables<'quote_item_taxes'>; // Tipus cru de la taula taxes
export type QuoteItemTable = Tables<'quote_items'>; // Tipus cru de la taula
// --- Tipus de la Funció RPC (Contracte Manual) ---
// ✅ CORREGIT: També actualitzem la RPC per reflectir la FASE 1
// (Assumint que has actualitzat la teva funció SQL 'search_paginated_quotes' 
// per seleccionar 'tax_rate' en lloc de 'tax_percent', etc.)
export interface RpcQuoteRow {
  id: QuoteId;
  quote_number: string | null;
  issue_date: string;
  expiry_date: string | null;
  // total: number | null; // ❌ ELIMINAT
  total_amount: number | null; // ✅ AFEGIT
  status: QuoteStatus;
  contact_id: number | null;
  currency: string | null; 
  terms: string | null; 
  language: string | null; 
  created_at: string;
  updated_at: string | null;
  subtotal: number | null;
  // tax_percent: number | null; // ❌ ELIMINAT
  tax_rate: number | null; // ✅ AFEGIT
  show_quantity: boolean | null;
  // discount: number | null; // ❌ ELIMINAT
  discount_amount: number | null; // ✅ AFEGIT
  // tax: number | null; // ❌ ELIMINAT
  tax_amount: number | null; // ✅ AFEGIT
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

export type QuoteItemRow = Database['public']['Tables']['quote_items']['Row'];

/* ----------------------------- QUOTE ITEM ----------------------------- */

// El QuoteItem que utilitzem a la UI (Frontend)
export type QuoteItem = Omit<QuoteItemTable, "tax_rate_id"> & {
    id?: number;               
    tempId?: string;           
    
    // AQUI ESTA LA CLAU: taxes ha de ser un array de TaxRate
    // Quan ve de la DB, potser es diu 'quote_item_taxes', així que ho mapejarem.
    taxes: TaxRate[];          
    
    total: number;             

    // Camps opcionals de frontend/backend
    description?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    product_id?: number | null;
    user_id?: string | null;
};

/* ------------------------------- QUOTE ------------------------------- */

export type QuotePayload = Partial<Omit<Quote, "id">> & {
    id: "new" | number;
    items: Partial<QuoteItem>[]; // Els items amb les seves taxes niades

    subtotal: number;
    tax_amount: number;
    total_amount: number;
    discount_amount: number;

    tax_rate?: number;
};

// ✅ CORRECCIÓ AQUÍ: Afegim 'tax_percent_input'
export type EditableQuote = QuotePayload & {
  discount_percent_input?: number | null;
  tax_percent_input?: number | null; // <--- Aquest camp faltava!
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

/**
 * Aquest és el tipus de dades que passem del servidor al client
 * a la pàgina PÚBLICA del pressupost.
 */
export type QuoteDataFromServer = QuoteRow & {
  contacts: ContactRow | null;  // 'contacts' (en minúscula)
  team: TeamRow | null;         // 'team' (en minúscula)
  items: QuoteItem[];           // 'items' (en lloc de 'quote_items')
};


// Definim l'estat de la interfície
export type EditorState = {
  quote: EditableQuote;
  currentTeamData: Team | null;
  contactOpportunities: Opportunity[];
  isDeleteDialogOpen: boolean;
  isProfileDialogOpen: boolean;
  sendingStatus: "idle" | "generating" | "uploading" | "sending";
};

// Definim les accions del Reducer amb tipatge estricte
export type EditorAction =
  | { type: "SET_QUOTE"; payload: EditableQuote }
  | { 
      type: "UPDATE_QUOTE_FIELD"; 
      // Això permet actualitzar qualsevol camp de EditableQuote assegurant el tipus correcte
      payload: { field: keyof EditableQuote; value: EditableQuote[keyof EditableQuote] } 
    }
  | { type: "SET_TEAM_DATA"; payload: Team | null }
  | { type: "SET_OPPORTUNITIES"; payload: Opportunity[] }
  | { type: "SET_DELETE_DIALOG"; payload: boolean }
  | { type: "SET_PROFILE_DIALOG"; payload: boolean }
  | { type: "SET_SENDING_STATUS"; payload: EditorState["sendingStatus"] };