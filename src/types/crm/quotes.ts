/**
 * @file src/types/crm/quotes.ts
 * @summary Defineix els tipus de dades per a Pressupostos, Oportunitats, Factures i Pipeline.
 */



// --- MAPES I TIPUS D'ESTATS ---

export const PIPELINE_STAGES_MAP = [
  { name: 'Prospecte', key: 'prospect' },
  { name: 'Contactat', key: 'contacted' },
  { name: 'Proposta Enviada', key: 'proposalSent' },
  { name: 'Negociació', key: 'negotiation' },
  { name: 'Guanyat', key: 'won' },
  { name: 'Perdut', key: 'lost' },
] as const;
type PipelineStageName = typeof PIPELINE_STAGES_MAP[number]['name'];

export const QUOTE_STATUS_MAP = [
  { dbValue: 'Draft',    key: 'draft',    colorClass: 'bg-yellow-900/50 text-yellow-300' },
  { dbValue: 'Sent',     key: 'sent',     colorClass: 'bg-blue-900/50 text-blue-300' },
  { dbValue: 'Accepted', key: 'accepted', colorClass: 'bg-green-900/50 text-green-300' },
  { dbValue: 'Declined', key: 'declined', colorClass: 'bg-red-900/50 text-red-300' },
] as const;
type QuoteStatus = typeof QUOTE_STATUS_MAP[number]['dbValue'];

export const INVOICE_STATUS_MAP = [
  { dbValue: 'Draft',     key: 'draft' },
  { dbValue: 'Sent',      key: 'sent' },
  { dbValue: 'Paid',      key: 'paid' },
  { dbValue: 'Overdue',   key: 'overdue' },
  { dbValue: 'Cancelled', key: 'cancelled' },
] as const;
type InvoiceStatus = typeof INVOICE_STATUS_MAP[number]['dbValue'];

// --- TIPUS PRINCIPALS ---

export type QuoteItem = {
  id?: number;
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  user_id: string; // Added user_id property

};

export type Quote = {
  id: string | 'new';
  contact_id: string | null;
  opportunity_id?: number | null;
  quote_number: string;
  issue_date: string;
  expiry_date?: string | null;
  status: QuoteStatus;
  notes: string | null;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  sent_at?: string | null;
  items: QuoteItem[];
  user_id?: string;
  contacts?: { nom: string | null; } | null;
  secure_id?: string;
};

export type Opportunity = { 
  id: string; 
  name: string; 
  stage_name: PipelineStageName;
  value: number | null;
  close_date?: string | null;
  description?: string | null;
  contact_id: string;
  contacts?: { id: string; nom: string | null; } | null;
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