/**
 * @file types.ts (Facturació)
 * @summary Fichero centralizado para las definiciones de tipos del módulo de facturación.
 */

// Mapa de datos para los estados de las facturas (base de datos -> UI)
export const INVOICE_STATUS_MAP = [
    { dbValue: 'Draft',   key: 'draft',   colorClass: 'bg-gray-500/10 text-gray-400 border border-gray-400/30' },
    { dbValue: 'Issued',  key: 'issued',  colorClass: 'bg-purple-500/10 text-purple-400 border border-purple-400/30' },
    { dbValue: 'Paid',    key: 'paid',    colorClass: 'bg-green-500/10 text-green-400 border border-green-400/30' },
    { dbValue: 'Overdue', key: 'overdue', colorClass: 'bg-red-500/10 text-red-400 border border-red-400/30' },
  ] as const;
  
  // Tipo seguro para los valores de estado en la base de datos
  type InvoiceStatus = typeof INVOICE_STATUS_MAP[number]['dbValue'];
  
  export type Contact = {
    id: string;
    nom: string;
  };
  
  export type InvoiceItem = {
    id?: string;
    description: string;
    quantity: number;
    unit_price: number;
  };
  
  export type Invoice = {
    id: string;
    user_id: string;
    contact_id: string;
    invoice_number: string | null;
    issue_date: string;
    due_date: string | null;
    status: InvoiceStatus;
    subtotal: number | null;
    tax_amount: number | null;
    total_amount: number | null;
    notes: string | null;
    created_at: string;
    company_name: string | null;
    client_name: string | null;
    contacts: Contact | null;
    invoice_items: InvoiceItem[];
  };