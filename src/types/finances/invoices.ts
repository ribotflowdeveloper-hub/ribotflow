// src/types/finances/invoices.ts
import { type Database } from '@/types/supabase';
import type { InvoiceStatus } from "@/config/invoices";
export type {
  InvoiceStatus
} from "@/config/invoices"; 
// --- Tipus Base (Reflectint Supabase - S'actualitzaran amb 'npx supabase gen types...') ---
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
export type InvoiceAttachmentRow = Database['public']['Tables']['invoice_attachments']['Row'];
// --- Constants i Tipus per a Status ---



// --- Tipus Enriquits ---

// Línia de factura - Ara inclou els nous camps
export interface InvoiceItem extends InvoiceItemRow {
    // InvoiceItemRow ja té id: string (UUID), product_id: number | null, etc.
    // Només afegim/modifiquem si és estrictament necessari per a la UI
    // ✅ CORRECCIÓ: Assegurem que els tipus opcionals coincideixen amb InvoiceItemRow (probablement number | null)
    discount_percentage: number | null; // Assegurem que no és undefined si InvoiceItemRow no ho permet
    discount_amount: number | null; // Assegurem que no és undefined si InvoiceItemRow no ho permet
    reference_sku: string | null; // Ja és string | null a InvoiceItemRow
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

// Factura completa per a la vista de detall - Ara inclou els nous camps de InvoiceRow
export interface InvoiceDetail extends InvoiceRow {
    // InvoiceRow ja té id: number (bigint), contact_id: number | null, etc.
    // ✅ CORRECCIÓ: project_id ara és string | null (UUID)
    project_id: string | null; // InvoiceRow té UUID, que és string | null
    invoice_items: InvoiceItem[];
    invoice_attachments: InvoiceAttachment[];
    contacts?: RelatedContact; // Manté la relació opcional
    // Els altres nous camps (terms, currency, etc.) venen d'InvoiceRow
}
// --- Tipus per a Formularis i Accions ---

// Tipus per a l'estat del formulari del client
// Ometem IDs/timestamps/camps de servidor/Verifactu.
// Mantenim camps calculats (totals) perquè la UI els necessita.
// Tipus per a l'estat del formulari del client
// Inclou els nous camps editables. Ometem timestamps específics com paid_at, sent_at
// Tipus per a l'estat del formulari del client
export interface InvoiceFormData extends Omit < InvoiceRow,
    'id' |
    'created_at' | 'updated_at' | 'user_id' | 'team_id' |
    'verifactu_uuid' | 'verifactu_qr_data' | 'verifactu_signature' | 'verifactu_previous_signature' |
    'paid_at' | 'sent_at' |
    'invoice_items' |
    'invoice_attachments' |
    // Excloem camps calculats que no es guarden directament des del formulari base
    'subtotal' | 'tax_amount' | 'total_amount'
    > {
    // Redefinim camps necessaris per al formulari amb tipus específics o opcionalitat
    id?: number; // Permetem ID opcional (bigint és number)
    invoice_items: InvoiceItem[];
    status: InvoiceStatus; // Usem el tipus estricte per al formulari
    issue_date: string; // Format YYYY-MM-DD
    due_date: string | null; // Format YYYY-MM-DD
    contact_id: number | null; // bigint és number
    budget_id: number | null; // bigint és number
    quote_id: number | null; // bigint és number
    // ✅ CORRECCIÓ: project_id és string | null
    project_id: string | null; // UUID és string
    // Camps per a l'edició/càlcul a la UI
    discount_amount: number; // Descompte GENERAL (number, no null)
    tax_rate: number; // Taxa GENERAL (number, no null)
    shipping_cost: number; // Cost enviament (number, no null)
    // Camps calculats (necessaris per a la UI, però exclosos de l'Omit base)
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    // La resta de camps de InvoiceRow (terms, currency, language, etc.)
    // heretats via Omit haurien de tenir el tipus correcte (string | null, string, etc.)
    // ✅ CORRECCIÓ: Assegurem que els camps que poden ser null a InvoiceRow també ho puguin ser aquí
    terms: string | null;
    currency: string; // A la BD és NOT NULL
    language: string; // A la BD és NOT NULL
    payment_details: string | null;
    company_logo_url: string | null; // Assegurem que coincideix (string | null)
    client_reference: string | null;
    // tax i discount (de InvoiceRow) són number | null
    tax: number | null;
    discount: number | null;
    // Camps denormalitzats (són string | null a InvoiceRow)
    client_name: string | null;
    client_tax_id: string | null;
    client_address: string | null;
    client_email: string | null;
    company_name: string | null;
    company_tax_id: string | null;
    company_address: string | null;
    company_email: string | null;
    // extra_data (jsonb | null)
    extra_data: Database['public']['Tables']['invoices']['Row']['extra_data'];
}

// Dades que s'envien a l'acció saveInvoiceAction
// Excloem camps calculats, IDs, timestamps, camps només lectura, etc.
export type InvoiceFormDataForAction = Omit < InvoiceFormData,
    'id' | 'invoice_items' |
    // 'created_at' | 'updated_at' | 'user_id' | 'team_id' | // Ja exclosos per Omit base
    'subtotal' | 'tax_amount' | 'total_amount' | // Es recalculen al servidor
    // 'verifactu_uuid' | ... | // Ja exclosos
    // 'paid_at' | 'sent_at' | // Ja exclosos
    // Camps denormalitzats (s'omplen al servidor si cal)
    'client_name' | 'client_tax_id' | 'client_address' | 'client_email' |
    'company_name' | 'company_tax_id' | 'company_address' | 'company_email'
    // company_logo_url podria venir d'un altre lloc (configuració d'empresa)
    // tax/discount són redundants si ja tenim rate/amount
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
  status?: InvoiceStatus | 'all';
  contactId?: number | 'all'; // bigint és number
   // ✅ Corregit: sortBy hauria d'incloure els nous camps si vols ordenar per ells
   //    i ajustar-se als tipus reals (project_id és string, etc.)
  sortBy?: keyof Pick<InvoiceRow, 'invoice_number' | 'issue_date' | 'due_date' | 'total_amount' | 'status' | 'client_name' | 'currency' /* afegeix més si cal */ > | 'contacts.nom';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}