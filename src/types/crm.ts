// fitxer: src/types/crm.ts

// ✅ 1. AFEGIM EL TIPUS 'CompanyProfile' QUE FALTAVA
export type CompanyProfile = {
  id: string;
  user_id: string;
  company_name?: string | null;
  company_tax_id?: string | null;
  company_address?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
  logo_url?: string | null;
};

// Aquesta serà la nostra única i definitiva definició de Contact
export type Contact = {
  id: string;
  created_at: string;
  nom: string;
  empresa: string | null;
  email: string | null;
  telefon: string | null;
  estat: 'Lead' | 'Actiu' | 'Client';
  valor: number | null;
  user_id: string;
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

export type QuoteItem = {
  id?: number;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
};

// ✅ 2. CORREGIM EL TIPUS 'Quote' PERQUÈ SIGUI COMPLET I CORRECTE
export type Quote = {
  id: string;
  contact_id: string;
  quote_number: string;
  status: 'Accepted' | 'Declined' | 'Draft' | 'Sent';
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  issue_date: string;
  expiry_date?: string | null;
  notes: string | null; // El fem no-opcional però pot ser null
  items: QuoteItem[];
  // Afegim camps que podrien faltar
  user_id: string;
  secure_id: string;
  opportunity_id?: number | null;
  sent_at?: string | null;
};

// Altres tipus CRM
export type Opportunity = { id: string; name: string; stage_name: string; value: number; };
export type Invoice = { id: string; invoice_number: string; status: string; total: number; };
export type Activity = { id: string; created_at: string; type: string; content: string; };