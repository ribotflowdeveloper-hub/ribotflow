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

// ✨ TIPUS ESPECÍFICS PER A L'INBOX (CORREGITS I COMPLETATS) ✨
// Aquest és el tipus principal per als tiquets, basat en la vista que ja inclou dades del contacte i perfil.
export type EnrichedTicket = DbTableRow<'enriched_tickets'>;
// Tipus per als membres de l'equip amb les dades del seu perfil.
export type TeamMemberWithProfile = DbTableRow<'team_members_with_profiles'>;
// Tipus per a la taula de permisos de l'inbox.
export type InboxPermission = DbTableRow<'inbox_permissions'>;
// Tipus base d'un tiquet (de la taula 'tickets'), per si es necessita.
export type Ticket = DbTableRow<'tickets'>;


// Tipus d'Enums
export type InvoiceStatus = Database['public']['Enums']['invoice_status'];
export type OpportunityStage = Database['public']['Enums']['opportunity_stage'];

// Aquest tipus és local de la UI, no ve de la DB, així que el podem mantenir aquí o en un fitxer de UI.
export type TicketFilter = 'tots' | 'rebuts' | 'noLlegits' | 'enviats';