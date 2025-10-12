// src/types/db.ts (NOU FITXER)

import { type Database } from './supabase'; // Importem el gegant

// --- Àlies Generals ---
// Si vols el tipus per a una fila completa d'una taula
export type DbTableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

// Si vols el tipus per a una nova inserció
export type DbTableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

// Si vols el tipus per a una actualització
export type DbTableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// --- Exportacions Específiques (Les més usades) ---
export type Contact = DbTableRow<'contacts'>;
export type Opportunity = DbTableRow<'opportunities'>;
export type Invoice = DbTableRow<'invoices'>;
export type Profile = DbTableRow<'profiles'>;
export type Team = DbTableRow<'teams'>;
export type Product = DbTableRow<'products'>;
export type Quote = DbTableRow<'quotes'>;
export type Template = DbTableRow<'email_templates'>;
// ...afegeix aquí tots els que utilitzis sovint

// També pots exportar tipus d'Enums si els fas servir molt
export type InvoiceStatus = Database['public']['Enums']['invoice_status'];
export type OpportunityStage = Database['public']['Enums']['opportunity_stage'];