/**
 * @file src/types/crm/contacts.ts
 * @summary Defineix els tipus de dades per als Contactes i el Dashboard General del CRM.
 */

// Importem tipus d'altres mòduls a través del fitxer 'index.ts' per evitar errors de dependència circular.
import type { Activity, Quote, Opportunity, Invoice, Task } from './index';

// --- MAPA I TIPUS D'ESTAT DE CONTACTE ---

export const CONTACT_STATUS_MAP = [
  { code: 'L', key: 'Lead' },
  { code: 'P', key: 'Proveidor' },
  { code: 'C', key: 'Client' },
] as const;

type ContactStatusCode = typeof CONTACT_STATUS_MAP[number]['code'];

// --- TIPUS PRINCIPALS ---

export type Contact = {
  id: string;
  nom: string;
  empresa: string | null;
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
  ubicacio?: string | null;
  last_interaction_at?: string | null;
  

};

// Tipus Mestre per a les dades relacionades d'un contacte
export type ContactRelatedData = {
    quotes: Quote[];
    opportunities: Opportunity[];
    invoices: Invoice[];
    activities: Activity[];
}

// Tipus mestre per a les dades del Dashboard General
export type CrmData = {
  stats: {
    totalContacts: number;
    newContactsThisMonth: number;
    opportunities: number;
    pipelineValue: number;
    avgRevenuePerClient: number;
    avgConversionTimeDays: number;
  };
  funnel: {
    leads: number;
    quoted: number;
    clients: number;
  };
  topClients: {
    id: string;
    nom: string;
    total_invoiced: number;
  }[];
  coldContacts: {
    id: string;
    nom: string;
    last_interaction_at: string;
  }[];
  bestMonths: {
    month: string;
    total: number;
  }[];
  unreadActivities: Activity[];
};

// Interfície per a les estadístiques principals del Dashboard
export interface DashboardStats {
  totalContacts: number;
  activeClients: number;
  opportunities: number;
  invoiced: number;
  pending: number;
  expenses: number;
  invoicedChange: string;
  expensesChange: string;
  invoicedIsPositive: boolean;
  expensesIsPositive: boolean;
}

// Interfície per al conjunt de dades inicials que el Dashboard rep
export interface DashboardInitialData {
  stats: DashboardStats;
  tasks: Task[]; // Assegura't que Task s'importi des de './index'
  contacts: Contact[];
  overdueInvoices: Invoice[];
  attentionContacts: Contact[];
}