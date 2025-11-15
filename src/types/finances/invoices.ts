// src/types/finances/invoices.ts
import { type Database } from "@/types/supabase";
import type { InvoiceStatus } from "@/config/invoices";
import { type TaxRate } from "./index";

export type { InvoiceStatus } from "@/config/invoices";
// --- Tipus Base (Reflectint Supabase - S'actualitzaran amb 'npx supabase gen types...') ---
export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceItemRow =
  Database["public"]["Tables"]["invoice_items"]["Row"];
export type InvoiceAttachmentRow =
  Database["public"]["Tables"]["invoice_attachments"]["Row"];
// --- Constants i Tipus per a Status ---

// --- Tipus Enriquits ---

// ✅ 2. MODIFICAT: Línia de factura
// Ometem 'tax_rate' (antic) i 'total' (el recarregarem a la UI)
export interface InvoiceItem extends Omit<InvoiceItemRow, 'tax_rate' | 'total'> {
  // 'id' ja ve de InvoiceItemRow i és 'string' (UUID).
  // El hook s'encarrega de crear IDs temporals com "temp-..." (string)
  taxes: TaxRate[]; // El nostre nou array d'impostos
  total: number;     // El nostre camp 'total' calculat a la UI (qty * price)
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
// ✅ 3. MODIFICAT: Detall de factura

export interface InvoiceDetail extends Omit<InvoiceRow, 'tax_rate' | 'tax_amount'> { // 👈 Ometem els camps antics
  // InvoiceRow ja té 'id', 'contact_id', 'legacy_tax_rate', 'legacy_tax_amount'
  // i els nous 'tax_amount' (total IVA) i 'retention_amount' (total IRPF)
  
  invoice_items: InvoiceItem[]; // 👈 Utilitza el nou 'InvoiceItem'
  invoice_attachments: InvoiceAttachment[];
  contacts?: RelatedContact;
}
// --- Tipus per a Formularis i Accions ---

// Tipus per a l'estat del formulari del client
// Ometem IDs/timestamps/camps de servidor/Verifactu.
// Mantenim camps calculats (totals) perquè la UI els necessita.
// Tipus per a l'estat del formulari del client
// Inclou els nous camps editables. Ometem timestamps específics com paid_at, sent_at
// Tipus per a l'estat del formulari del client
// ✅ 4. MODIFICAT: Estat del formulari
export interface InvoiceFormData extends
  Omit<
    InvoiceRow,
    | "id"
    | "created_at"
    | "updated_at"
    | "user_id"
    | "team_id"
    | "verifactu_uuid"
    | "verifactu_qr_data"
    | "verifactu_signature"
    | "verifactu_previous_signature"
    | "paid_at"
    | "sent_at"
    | "invoice_items"
    | "invoice_attachments"
    | "subtotal"
    | "tax_amount"
    | "total_amount"
    | "retention_amount"
    | // Excloem tots els camps calculats
    "legacy_tax_rate"
    | "legacy_tax_amount"
    | // Excloem els camps antics
    "tax_rate" // 👈 Aquest és el 'tax_rate' de línia que hi havia a InvoiceItemRow
  > {
  id?: number;
  invoice_items: InvoiceItem[]; // 👈 Utilitza el nou 'InvoiceItem'
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  contact_id: number | null;
  budget_id: number | null;
  quote_id: number | null;
  project_id: string | null;

  // Camps per a l'edició/càlcul a la UI
  discount_amount: number; // Descompte GENERAL
  shipping_cost: number; // Cost enviament

  // Camps calculats (necessaris per a la UI)
  subtotal: number;
  tax_amount: number; // Total IVA
  retention_amount: number; // Total IRPF
  total_amount: number;

  // 🚫 'tax_rate' global ja no existeix

  // ... (la resta de camps: terms, currency, etc. es queden igual)
  terms: string | null;
  currency: string;
  language: string;
  payment_details: string | null;
  company_logo_url: string | null;
  client_reference: string | null;
  tax: number | null;
  discount: number | null;
  client_name: string | null;
  client_tax_id: string | null;
  client_address: string | null;
  client_email: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  company_address: string | null;
  company_email: string | null;
  extra_data: Database["public"]["Tables"]["invoices"]["Row"]["extra_data"];
}

// Dades que s'envien a l'acció saveInvoiceAction
// Excloem camps calculats, IDs, timestamps, camps només lectura, etc.
export type InvoiceFormDataForAction = Omit<
  InvoiceFormData,
  | "id"
  | "invoice_items"
  | // 'created_at' | 'updated_at' | 'user_id' | 'team_id' | // Ja exclosos per Omit base
  "subtotal"
  | "tax_amount"
  | "total_amount"
  | // Es recalculen al servidor
  // 'verifactu_uuid' | ... | // Ja exclosos
  // 'paid_at' | 'sent_at' | // Ja exclosos
  // Camps denormalitzats (s'omplen al servidor si cal)
  "client_name"
  | "client_tax_id"
  | "client_address"
  | "client_email"
  | "company_name"
  | "company_tax_id"
  | "company_address"
  | "company_email"
> // company_logo_url podria venir d'un altre lloc (configuració d'empresa)
; // tax/discount són redundants si ja tenim rate/amount
// 'tax' | 'discount'

// --- Tipus per a Llistes i Filtres ---

// Columnes seleccionades per a la taula de llista
// Inclou camps de 'invoices' i opcionalment 'contacts.nom'
export type InvoiceListRow =
  & Pick<
    InvoiceRow,
    | "id"
    | "invoice_number"
    | "issue_date"
    | "due_date"
    | "total_amount"
    | "status"
    | "client_name"
    | "contact_id"
  >
  & {
    // Relació opcional per mostrar el nom del contacte si fas JOIN
    contacts?: { nom: string | null } | null;
  };

// Resposta paginada per a l'acció fetchPaginatedInvoices
export interface PaginatedInvoicesResponse {
  data: InvoiceListRow[];
  count: number;
}

// Filtres per a l'acció fetchPaginatedInvoices
export interface InvoiceFilters {
  searchTerm?: string;
  status?: InvoiceStatus | "all";
  contactId?: number | "all"; // bigint és number
  // ✅ Corregit: sortBy hauria d'incloure els nous camps si vols ordenar per ells
  //    i ajustar-se als tipus reals (project_id és string, etc.)
  sortBy?:
    | keyof Pick<
      InvoiceRow,
      | "invoice_number"
      | "issue_date"
      | "due_date"
      | "total_amount"
      | "status"
      | "client_name"
      | "currency" /* afegeix més si cal */
    >
    | "contacts.nom";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}
