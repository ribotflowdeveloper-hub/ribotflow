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
export type InvoiceItem = DbTableRow<'invoice_items'>; // ✅ AFEGIT (per a la lògica de syncInvoiceItems)
export type Profile = DbTableRow<'profiles'>;
export type Team = DbTableRow<'teams'>;
export type Product = DbTableRow<'products'>;
export type Quote = DbTableRow<'quotes'>;
export type Template = DbTableRow<'email_templates'>;
export type Activity = DbTableRow<'activities'>;
export type Task = DbTableRow<'tasks'>; // ✅ Canviat 'Tables' per 'Task' per claredat
export type Pipeline = DbTableRow<'pipelines'>; // ✅ AFEGIT
export type PipelineStage = DbTableRow<'pipeline_stages'>;

// --- TIPUS ESPECÍFICS PER A L'INBOX ---
export type EnrichedTicket = DbTableRow<'enriched_tickets'>;
export type TeamMemberWithProfile = DbTableRow<'team_members_with_profiles'>;
export type InboxPermission = DbTableRow<'inbox_permissions'>;
export type Ticket = DbTableRow<'tickets'>;

// --- TIPUS ESPECÍFICS PER A COMUNICACIÓ ---
export type SocialPost = DbTableRow<'social_posts'>;
export type AudioJob = DbTableRow<'audio_jobs'>; // ✅ AFEGIT

// Aquest tipus és específic per a una funció de lectura.
// Idealment, mou-ho a src/types/db.ts o similar.
export type TicketForSupplier = Database['public']['Tables']['tickets']['Row'] & {
  contacts: {
    id: number;
    nom: string | null;
    email: string | null;
  } | null;
};

export type Department = DbTableRow<'departments'>;
export type EmailTemplate = DbTableRow<'email_templates'>;
export type Supplier = DbTableRow<'suppliers'>;

// --- Tipus d'Enums ---
export type InvoiceStatus = Database['public']['Enums']['invoice_status'];
export type OpportunityStage = Database['public']['Enums']['opportunity_stage'];
export type AudioJobStatus = Database['public']['Enums']['audio_job_status']; // ✅ AFEGIT

// Aquest tipus és local de la UI, està bé mantenir-lo aquí.
export type TicketFilter = 'tots' | 'rebuts' | 'noLlegits' | 'enviats';

export type ContactForSupplier = Contact & {
  supplier?: Pick<Supplier, "id" | "nom" | "email"> | null;
};

