// src/types/finances/expenses.ts (Versió consolidada i tipada)

import { Contact } from '@/types/crm/contacts'; // Per a la relació amb el Proveïdor
// import { Database } from '@/types/supabase'; // Si l'SDK ho genera automàticament

// --- 1. Tipus d'Elements (Basats en les teves definicions) ---

export type ExpenseItem = {
    id?: number; // bigint (opcional per a la creació, present per a l'actualització)
    expense_id: number; // Clau forana, afegida aquí per claredat en la sincronització
    description: string;
    quantity: number;
    unit_price: number;
    total: number; // Afegit per consistència amb el càlcul
};

export type ExpenseAttachment = {
    id: string; // UUID de l'adjunt
    file_path: string;
    filename: string;
    mime_type: string;
    expense_id: number;
};

// --- 2. Tipus Base de Despesa (Taula `expenses`) ---

// Utilitzem number per a l'ID (bigint) i afegim team_id (crucial)
export type Expense = {
    id: number; 
    team_id: string; // Afegit: Crucial per RLS i context d'acció
    user_id: string;
    created_at: string;
    
    supplier_id: string | null;
    invoice_number: string | null;
    expense_date: string; // format YYYY-MM-DD
    category: string | null;
    description: string;
    notes?: string | null;

    subtotal: number;
    total_amount: number;
    discount_amount: number | null;
    tax_rate: number | null;
    tax_amount: number | null;
    
    status: string; // Deixar-ho com a string o l'enum 'pending'|'paid'|...
};

// --- 3. Tipus Compostos (per a les vistes i accions) ---

// Tipus usat a la llista (només amb el nom del proveïdor)
export type ExpenseWithContact = Expense & {
    suppliers: Pick<Contact, 'id' | 'nom'> | null; 
};

// Tipus per a la vista de detall (totes les dades relacionals)
export type ExpenseDetail = ExpenseWithContact & {
    suppliers: Pick<Contact, 'id' | 'nom' | 'nif'> | null; // Tipus de detall del proveïdor
    expense_items: ExpenseItem[];
    expense_attachments: ExpenseAttachment[];
};


// Tipus que s'envia a `saveExpenseAction`
// Exclou camps de DB auto-generats/gestionats per la sessió (user_id, team_id, created_at)
// Exclou camps de relació que no van a la taula principal (suppliers, attachments)
export type ExpenseFormDataForAction = Omit<
  Expense,
  'id' | 'created_at' | 'user_id' | 'team_id' | 'suppliers' // 'suppliers' s'elimina
> & {
    id?: string | number | null; // L'ID pot ser opcional o string/number
    expense_items?: ExpenseItem[]; // Els ítems venen separats
};


// Mapeig d'Estatus de Despeses (configuració d'UI, utilitzat a ExpensesClient)
export const EXPENSE_STATUS_MAP = [
    { dbValue: 'pending', key: 'pending', colorClass: 'bg-yellow-100' },
    { dbValue: 'paid', key: 'paid', colorClass: 'bg-green-600' },
    { dbValue: 'reimbursed', key: 'reimbursed', colorClass: 'bg-blue-100' },
    { dbValue: 'rejected', key: 'rejected', colorClass: 'bg-red-600' },
];