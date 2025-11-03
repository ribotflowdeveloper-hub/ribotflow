// src/types/db.ts
import { type Database } from './supabase'; // Importem el gegant

// --- Àlies Generals ---
// Tipus per a una fila completa d'una taula o vista
export type DbTableRow<
  T extends keyof (Database['public']['Tables'] & Database['public']['Views'])
> = (Database['public']['Tables'] & Database['public']['Views'])[T]['Row'];

// Tipus per a una nova inserció
export type DbTableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

// Tipus per a una actualització
export type DbTableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// --- Àlies per a Funcions RPC ---
export type DbFunction<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]['Returns'];

// --- Exportacions Específiques (Les més usades) ---
export type Contact = DbTableRow<'contacts'>;
export type Opportunity = DbTableRow<'opportunities'>;
export type Invoice = DbTableRow<'invoices'>;
export type Profile = DbTableRow<'profiles'>;
export type Team = DbTableRow<'teams'>;
export type Product = DbTableRow<'products'>;
export type Quote = DbTableRow<'quotes'>;
export type Template = DbTableRow<'email_templates'>;
export type Activity = DbTableRow<'activities'>;

// --- TIPUS ESPECÍFICS PER A L'INBOX ---
export type EnrichedTicket = DbTableRow<'enriched_tickets'>;
export type TeamMemberWithProfile = DbTableRow<'team_members_with_profiles'>;
export type InboxPermission = DbTableRow<'inbox_permissions'>;
export type Ticket = DbTableRow<'tickets'>;

// --- TIPUS DE RELACIONS (COM EL QUE FALTAVA) ---
export type SocialPost = DbTableRow<'social_posts'>;
// ✅ SOLUCIÓ: Definim el tipus que necessitàvem a 'inbox.service.ts'
// Es basa en la consulta: .from('tickets').select('*, contacts(id, nom, email)')
export type TicketForSupplier = Ticket & {
  contacts: Pick<Contact, 'id' | 'nom' | 'email'> | null;
};

export type EmailTemplate = DbTableRow<'email_templates'>;
export type Supplier = DbTableRow<'suppliers'>;

// --- Tipus d'Enums ---
export type InvoiceStatus = Database['public']['Enums']['invoice_status'];
export type OpportunityStage = Database['public']['Enums']['opportunity_stage'];

// Aquest tipus és local de la UI, està bé mantenir-lo aquí.
export type TicketFilter = 'tots' | 'rebuts' | 'noLlegits' | 'enviats';