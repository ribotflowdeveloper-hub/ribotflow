/**
 * @file src/types/crm/quotes.ts
 * @summary Defineix els tipus de dades per a Pressupostos, Oportunitats, Factures i Pipeline.
 */


import type {Contact} from "@/types/crm";
import type { Team as CompanyProfile } from "@/types/settings/team";
import type { InvoiceStatus } from "@/config/invoices";
import type { QuoteStatus } from "@/config/styles/quotes";
// --- MAPES I TIPUS D'ESTATS ---

// --- TIPUS PRINCIPALS ---

export type QuoteItem = {
  id?: number;
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  user_id: string; // Added user_id property
  tax_rate: number;
  total: number;
};

export type Quote = {
  id: string | 'new';
  contact_id: string | null;
  opportunity_id?: number | null;
  quote_number: string;
  sequence_number: number; // ✅ Nova propietat per al número seqüencial
  issue_date: string;
  expiry_date?: string | null;
  status: QuoteStatus;
  notes: string | null;
  discount: number;
  subtotal: number;
  tax: number;
  tax_percent: number; // ✅ Afegeix la nova propietat
  total: number;
  sent_at?: string | null;
  items: QuoteItem[];
  user_id?: string;
  contacts?: { nom: string | null; } | null;
  secure_id?: string;
  show_quantity?: boolean; // ✅ AFEGEIX AQUESTA LÍNIA

};



export type Invoice = { 
  id: string; 
  invoice_number: string; 
  status: InvoiceStatus;
  total: number;
  contact_id: string;
  contacts?: { nom: string | null; } | null;
  due_date: string; // ✅ Ha de ser obligatori

};


export type QuoteDataFromServer = Quote & {
  contacts: Contact | null;
  team: CompanyProfile | null;
  quote_items: QuoteItem[];
  secure_id: string;
 
};

