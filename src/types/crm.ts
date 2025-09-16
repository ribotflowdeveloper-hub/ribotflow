// Aquest fitxer serà l'única font de veritat per als tipus del CRM.
// ✅ 1. Definim els estats com una constant exportable.
// 'as const' és clau: converteix l'array en una tupla de només lectura amb tipus literals.
// ✅ AQUEST ÉS EL CANVI MÉS IMPORTANT: El nostre nou "mapa" de dades.
// Defineix el codi per a la base de dades i la clau per a les traduccions.
export const CONTACT_STATUS_MAP = [
  { code: 'L', key: 'Lead' },
  { code: 'P', key: 'Proveidor' },
  { code: 'C', key: 'Client' },
] as const;

// ✅ 2. Creem un tipus a partir dels valors de la constant.
// Això genera el tipus: 'Lead' | 'Proveidor' | 'Client'
// Creem un tipus per als codis que aniran a la base de dades ('L' | 'P' | 'C')
type ContactStatusCode = typeof CONTACT_STATUS_MAP[number]['code'];


// ✅ AFEGEIX AQUEST NOU MAPA PER A LES ETAPES DEL PIPELINE
export const PIPELINE_STAGES_MAP = [
  { name: 'Prospecte', key: 'prospect' },
  { name: 'Contactat', key: 'contacted' },
  { name: 'Proposta Enviada', key: 'proposalSent' },
  { name: 'Negociació', key: 'negotiation' },
  { name: 'Guanyat', key: 'won' },
  { name: 'Perdut', key: 'lost' },
] as const;


export const QUOTE_STATUS_MAP = [
  { dbValue: 'Draft',    key: 'draft',    colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  { dbValue: 'Sent',     key: 'sent',     colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  { dbValue: 'Accepted', key: 'accepted', colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  { dbValue: 'Declined', key: 'declined', colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
] as const;

// Creem un tipus per als valors que aniran a la base de dades ('Draft' | 'Sent' | ...)
type QuoteStatus = typeof QUOTE_STATUS_MAP[number]['dbValue'];

export type QuoteItem = {
  id?: number;
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
};

export type Quote = {
  id: string | 'new';
  contact_id: string | null; // Permetem que sigui null per a pressupostos nous
  opportunity_id?: number | null;
  quote_number: string;
  issue_date: string;
  expiry_date?: string | null;
  status: QuoteStatus;  notes: string;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  sent_at?: string | null;
  items: QuoteItem[];
  // Camps opcionals que poden no existir en un pressupost nou
  user_id?: string;
  secure_id?: string;
};


// Aquesta serà la nostra única i definitiva definició de Contact
export type Contact = {
  id: string; 
  nom: string; 
  empresa: string | null; 
  // Afegim la resta de camps com a opcionals
  created_at?: string;
  email?: string | null;
  telefon?: string | null;
  estat?: ContactStatusCode; 
  valor?: number | null;
  user_id?: string;
  job_title?: string | null;
  industry?: string | null;
  lead_source?: string | null;
  birthday?: string | null;
  notes?: string | null;
  children_count?: number | null;
  partner_name?: string | null;
  hobbies?: string[] | null;
  address?: { city: string | null } | null;
  social_media?: { linkedin: string | null } | null;
};
export type Product = { 
  id: number; 
  name: string; 
  description?: string | null; 
  price: number; 
};

export type CompanyProfile = { 
  id: string; 
  user_id: string; 
  company_name?: string | null; 
  company_tax_id?: string | null; 
  company_address?: string | null; 
  company_email?: string | null; 
  company_phone?: string | null; 
  logo_url?: string | null; 
} | null;

// ✅ CORRECCIÓ: Assegurem que el tipus Opportunity sempre tingui 'value'
export type Opportunity = { 
  id: string; 
  name: string; 
  stage_name: string; 
  value: number; 
};
// Altres tipus CRM
export type Invoice = { id: string; invoice_number: string; status: string; total: number; };
export type Activity = { id: string; created_at: string; type: string; content: string; };