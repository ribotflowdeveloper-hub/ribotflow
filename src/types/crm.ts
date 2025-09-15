// Aquest fitxer serà l'única font de veritat per als tipus del CRM.
// ✅ 1. Definim els estats com una constant exportable.
// 'as const' és clau: converteix l'array en una tupla de només lectura amb tipus literals.
export const CONTACT_STATUSES = ['Lead', 'Proveidor', 'Client'] as const;

// ✅ 2. Creem un tipus a partir dels valors de la constant.
// Això genera el tipus: 'Lead' | 'Proveidor' | 'Client'
type ContactStatus = (typeof CONTACT_STATUSES)[number];

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
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  notes: string;
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
  estat?: ContactStatus;
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