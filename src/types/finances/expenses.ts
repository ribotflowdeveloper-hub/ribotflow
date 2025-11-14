// src/types/finances/expenses.ts (Versió consolidada i tipada)

import type { Contact } from "@/types/db";
// import { Database } from '@/types/supabase'; // Si l'SDK ho genera automàticament
import type { ActionResult } from "../shared/actionResult"; // Tipus genèric per a resultats d'accions
// --- 1. Tipus d'Elements (Basats en les teves definicions) ---
import { TaxRate } from "./taxes"; // Importem el tipus TaxRate

// MODIFICAT: ExpenseItem ara inclou els impostos per a l'estat del formulari
export type ExpenseItem = {
  id?: number | string; // ID temporal (Date.now()) o real (UUID/number)
  expense_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number; // (quantity * unit_price)
  taxes: TaxRate[]; // Llista d'impostos seleccionats per aquest item
};

export type ExpenseAttachment = {
  id: string; // UUID de l'adjunt
  file_path: string;
  filename: string;
  mime_type: string;
  expense_id: number;
};

// --- 2. Tipus Base de Despesa (Taula `expenses`) ---
export type ExpenseCategory = {
  id: string; // uuid
  team_id: string; // uuid
  name: string;
  description: string | null;
};
// ✅ NOU: Definim el tipus per a l'estat de la despesa, basat en l'ENUM de la DB
export type ExpenseStatus = "pending" | "paid" | "overdue" | "cancelled";

export interface Expense {
  id: number;
  user_id: string;
  team_id: string;
  description: string;
  total_amount: number;
  expense_date: string; // format YYYY-MM-DD
  category_id: string | null; // 👈 NOU (UUID de la categoria)
  legacy_category_name: string | null; // 👈 Antic camp de text
  created_at: string;
  invoice_number: string | null;

  // --- NOUS CAMPS DE TOTALS ---
  subtotal: number | null;
  discount_rate: number | null; // ✅ AFEGIT
  discount_amount: number | null;
  tax_amount: number; // Suma de 'vat' (IVA)
  retention_amount: number; // Suma de 'retention' (IRPF)

  notes: string | null;

  // --- CAMPS ANTICS (LEGACY) ---
  legacy_tax_rate: number | null; // <-- El camp reanomenat
  legacy_tax_amount: number | null; // <-- El camp reanomenat

  // --- NOUS CAMPS DE LA MIGRACIÓ ---
  currency: string;
  due_date: string | null;

  // --- CAMPS DE GESTIÓ ---
  supplier_id: string | null;
  status: ExpenseStatus; // Assegura't que 'ExpenseStatus' estigui definit
  payment_date: string | null;
  payment_method: string | null;
  is_billable: boolean;
  project_id: string | null;
  is_reimbursable: boolean;

  // ❌ EL CAMP 'tax_rate' JA NO EXISTEIX AQUÍ
}

// ... (la resta dels teus tipus: ExpenseWithContact, ExpenseDetail, ExpenseFormDataForAction)
// Assegura't que 'ExpenseFormDataForAction' OMET els camps 'legacy_'
export type ExpenseFormDataForAction =
  & Omit<
    Expense,
    | "id"
    | "created_at"
    | "user_id"
    | "team_id"
    // | 'suppliers' // Afegeix 'suppliers' si el tenies al Omit
    | "legacy_tax_rate" // 👈 Important
    | "legacy_tax_amount" // 👈 Important
    | "legacy_category_name" // 👈 Afegim l'antic al Omit
  >
  & {
    id?: string | number | null;
    expense_items: ExpenseItem[];
  };

// ✅ MODIFICAT: Aquest tipus és el que s'utilitza a la llista
export type ExpenseWithContact = Expense & {
    suppliers: Pick<Contact, 'id' | 'nom'> | null;
    
    // ✅ AFEGIT: Afegim el nom de la categoria que ve del JOIN
    category_name: string | null; 
    
    // ✅ CANVIAT: 'category' (el camp de text antic) ja no hauria d'existir
    // El mantenim temporalment si el teu 'Expense' encara el té
    category?: string | null; // Aquest és el nom
};

// Tipus per a la vista de detall (totes les dades relacionals)
export type ExpenseDetail = ExpenseWithContact & {
  suppliers: Pick<Contact, "id" | "nom"> | null; // Tipus de detall del proveïdor
  expense_items: ExpenseItem[];
  expense_attachments: ExpenseAttachment[];
};

// Mapeig d'Estatus de Despeses (configuració d'UI, utilitzat a ExpensesClient)
export const EXPENSE_STATUS_MAP = [
  { dbValue: "pending", key: "pending", colorClass: "bg-yellow-100" },
  { dbValue: "paid", key: "paid", colorClass: "bg-green-600" },
  { dbValue: "reimbursed", key: "reimbursed", colorClass: "bg-blue-100" },
  { dbValue: "rejected", key: "rejected", colorClass: "bg-red-600" },
];

// src/types/finances/expenses.ts

// ... (els teus altres tipus com ExpenseDetail, ExpenseItem, etc.)

/**
 * Tipus per a les dades d'un concepte extretes per l'IA.
 */
export interface AnalyzedExpenseItem {
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
}

/**
 * L'objecte de dades complet que retorna l'IA,
 * enriquit amb el supplier_id de la nostra BD.
 */
export interface ExpensesAnalysisData {
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null; // YYYY-MM-DD
  total_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null; // <-- Camp obligatori (pot ser null)
  currency: string | null;
  items: AnalyzedExpenseItem[];
  supplier_id: string | null; // L'ID resolt de la nostra BD
}

/**
 * El tipus de retorn complet de la nostra Server Action,
 * utilitzant el teu 'ActionResult' genèric.
 */
export type ExpensesAnalysisActionResult = ActionResult<ExpensesAnalysisData>;
