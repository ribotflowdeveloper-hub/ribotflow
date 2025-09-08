// src/types/crm.ts

// Aquesta serà la nostra única i definitiva definició de Contact
export type Contact = {
    id: string;
    created_at: string;
    nom: string;
    empresa: string | null;
    email: string;
    telefon: string | null;
    estat: 'Lead' | 'Actiu' | 'Client';
    valor: number | null;
    user_id: string;
    // Camps addicionals per a la vista de detall
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
  
  // Pots afegir altres tipus aquí en el futur
  export type Quote = { id: string; quote_number: string; status: string; total: number; };
  export type Opportunity = { id: string; name: string; stage_name: string; value: number; };
  export type Invoice = { id: string; invoice_number: string; status: string; total: number; };
  export type Activity = { id: string; created_at: string; type: string; content: string; };