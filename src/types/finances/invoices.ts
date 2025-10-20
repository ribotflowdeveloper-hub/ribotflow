// src/types/finances/invoices.ts
import { type Database} from '@/types/supabase'; // Ajusta la ruta si cal

// --- Tipus Base (Reflectint Supabase) ---

export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
export type InvoiceAttachmentRow = Database['public']['Tables']['invoice_attachments']['Row'];

// --- Constants i Tipus per a Status ---

// Mapa de dades per als estats (basat en el teu exemple)
// Adaptat per coincidir amb els valors ENUM de Supabase si els tens,
// o els valors 'text' que fas servir a la columna 'status'.
export const INVOICE_STATUS_MAP = [
 { dbValue: 'Draft',     key: 'draft',   colorClass: 'bg-gray-500/10 text-gray-400 border border-gray-400/30' },
 { dbValue: 'Sent',      key: 'sent',    colorClass: 'bg-blue-500/10 text-blue-400 border border-blue-400/30' }, // Canviat de Issued a Sent per coincidir amb ENUM
 { dbValue: 'Paid',      key: 'paid',    colorClass: 'bg-green-500/10 text-green-400 border border-green-400/30' },
 { dbValue: 'Overdue',   key: 'overdue', colorClass: 'bg-red-500/10 text-red-400 border border-red-400/30' },
 { dbValue: 'Cancelled', key: 'cancelled', colorClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-400/30' }, // Canviat de Cancelled per consistència
] as const;


// Tipus per a l'estat, derivat del mapa o de l'ENUM de Supabase
// Si 'status' a Supabase és ENUM 'invoice_status', pots usar:
// export type InvoiceStatus = Database['public']['Enums']['invoice_status'];
// Si és 'text', definim els valors esperats:
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';

// --- Tipus Enriquits ---

// Línia de factura
export interface InvoiceItem extends InvoiceItemRow {
  // L'ID és UUID (string) segons el teu esquema
  id: string;
  // product_id és bigint (number)
  product_id: number | null;
  // La resta de camps semblen correctes
}

// Adjunt de factura
export interface InvoiceAttachment extends InvoiceAttachmentRow {
  // L'ID és UUID (string)
  id: string;
}

// Contacte relacionat (si fas servir contact_id com a FK)
// L'ID a la taula contacts és bigint (number)
export type RelatedContact = {
  id: number;
  nom: string | null;
  // Afegeix altres camps si cal (nif, email...)
} | null; // Permetem null si no hi ha contacte vinculat

// Factura completa per a la vista de detall
export interface InvoiceDetail extends InvoiceRow {
  // L'ID és bigint (number)
  id: number;
  // Assegurem que contact_id és number | null
  contact_id: number | null;
  // Items i Attachments
  invoice_items: InvoiceItem[];
  invoice_attachments: InvoiceAttachment[];
  // Relació opcional si fas JOIN (o si vols carregar-la per separat)
  contacts?: RelatedContact;
}

// --- Tipus per a Formularis i Accions ---

// Tipus per a l'estat del formulari del client
// Ometem IDs/timestamps/camps de servidor/Verifactu.
// Mantenim camps calculats (totals) perquè la UI els necessita.
export interface InvoiceFormData extends Omit < InvoiceRow,
  'id' | // L'ID es gestiona per separat
  'created_at' | 'updated_at' | 'user_id' | 'team_id' |
  'verifactu_uuid' | 'verifactu_qr_data' | 'verifactu_signature' | 'verifactu_previous_signature' |
  'invoice_items' | // Es gestiona com a array separat
  'invoice_attachments' // Es gestiona per separat
  > {
    id?: number; // Permetem ID opcional per saber si editem o creem
    invoice_items: InvoiceItem[]; // Array de línies
    status: InvoiceStatus; // Usem el tipus estricte
    issue_date: string; // Assegurem que és string (YYYY-MM-DD)
    due_date: string | null; // Assegurem que és string (YYYY-MM-DD) o null
    contact_id: number | null; // bigint
    budget_id: number | null; // bigint
    quote_id: number | null; // bigint
    // Assegurem tipus numèrics
    subtotal: number;
    discount_amount: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    // Mantenim tax i discount si els fas servir diferent de tax_rate/discount_amount
    tax: number | null;
    discount: number | null;
}

// Dades que s'envien a l'acció saveInvoiceAction (només camps editables per l'usuari)
// Excloem camps calculats (es recalculen al servidor), IDs, timestamps, etc.
export type InvoiceFormDataForAction = Omit < InvoiceFormData,
  'id' | 'invoice_items' |
  'created_at' | 'updated_at' | 'user_id' | 'team_id' |
  'subtotal' | 'tax_amount' | 'total_amount' | // Es recalculen
  'verifactu_uuid' | 'verifactu_qr_data' | 'verifactu_signature' | 'verifactu_previous_signature' |
  // Els camps desnormalitzats (client_*, company_*) normalment s'omplen al servidor
  'client_name' | 'client_tax_id' | 'client_address' | 'client_email' |
  'company_name' | 'company_tax_id' | 'company_address' | 'company_email'
  // Si tax/discount són només informatius, exclou-los també
  // 'tax' | 'discount'
>;


// --- Tipus per a Llistes i Filtres ---

// Columnes seleccionades per a la taula de llista
// Inclou camps de 'invoices' i opcionalment 'contacts.nom'
export type InvoiceListRow = Pick<InvoiceRow,
    'id' | 'invoice_number' | 'issue_date' | 'due_date' | 'total_amount' | 'status' | 'client_name' | 'contact_id'
> & {
    // Relació opcional per mostrar el nom del contacte si fas JOIN
     contacts?: { nom: string | null } | null
};

// Resposta paginada per a l'acció fetchPaginatedInvoices
export interface PaginatedInvoicesResponse {
  data: InvoiceListRow[];
  count: number;
}

// Filtres per a l'acció fetchPaginatedInvoices
export interface InvoiceFilters {
  searchTerm?: string;
  status?: InvoiceStatus | 'all'; // Filtre per estat
  contactId?: number | 'all'; // Filtre per client (ID és bigint)
  // Camps per ordenar (claus de InvoiceRow o noms de relació com 'contacts.nom')
  sortBy?: keyof Pick<InvoiceRow, 'invoice_number' | 'issue_date' | 'due_date' | 'total_amount' | 'status' | 'client_name'> | 'contacts.nom';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}