// src/types/db.ts
import { type Database } from './supabase';

// --- Àlies Generals ---
export type DbTableRow<
  T extends keyof (Database['public']['Tables'] & Database['public']['Views'])
> = (Database['public']['Tables'] & Database['public']['Views'])[T]['Row'];

export type DbTableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type DbTableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// --- Entitats Principals (Inferides automàticament) ---
export type Contact = DbTableRow<'contacts'>;
export type Supplier = DbTableRow<'suppliers'>;
export type Opportunity = DbTableRow<'opportunities'>;
export type Quote = DbTableRow<'quotes'>;
export type Invoice = DbTableRow<'invoices'>;
export type Activity = DbTableRow<'activities'>;
export type Task = DbTableRow<'tasks'>;
export type InvoiceItem = DbTableRow<'invoice_items'>;
export type Expense = DbTableRow<'expenses'>;
export type Team = DbTableRow<'teams'>;
export type Notification = DbTableRow<'notifications'>;


// --- Tipus estesos (JOINs) ---
// Aquests són els únics llocs on hauries de fer "types manuals"
// per representar les dades que venen de relacions.

export type ContactWithOpportunities = Contact & {
  opportunities: { id: number; value: number | null }[]; // Ajustat a number segons la teva BD normalment
};

export type ContactForSupplier = Pick<Contact, 'id' | 'nom' | 'email' | 'telefon'>;

// Eliminem la necessitat de src/types/crm/contacts.ts manual