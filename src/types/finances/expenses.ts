import { z } from "zod";
import type { 
  Expense as DbExpense, 
  ExpenseItem as DbExpenseItem,
  ExpenseCategory as DbExpenseCategory,
  ExpenseAttachment as DbExpenseAttachment,
  Contact,
} from "@/types/db";
import type { TaxRate } from "./taxes";


// --- 1. TIPUS BASE (BD) ---
export type Expense = DbExpense;
export type ExpenseCategory = DbExpenseCategory;
export type ExpenseAttachment = DbExpenseAttachment;

// --- 2. TIPUS DE FORMULARI (UI) ---

// ✅ CORRECCIÓ FINAL: Ometem també 'created_at'
export type ExpenseItemForm = Omit<DbExpenseItem, 'id' | 'created_at'> & {
    // L'ID pot ser string (UUID temporal) o number (BD), o undefined si és nou
    id?: string | number; 
    created_at?: string | null; // El fem opcional per als nous items
    
    // Afegim la propietat de formulari
    taxes: TaxRate[]; 
};

// --- 3. TIPUS PER A L'ACCIÓ (FormData) ---
export type ExpenseFormDataForAction = Omit<
  Expense,
  | "id"
  | "created_at"
  | "user_id"
  | "team_id"
  | "legacy_tax_rate"
  | "legacy_tax_amount"
  | "legacy_category_name"
> & {
  id?: string | number | null;
  // ✅ AQUÍ ESTÀ EL CANVI: Utilitzem el tipus enriquit amb taxes
  expense_items: ExpenseItemForm[];
};

// --- 4. TIPUS ENRIQUITS (Llistats) ---
export type EnrichedExpense = Expense & {
    suppliers: Pick<Contact, 'id' | 'nom'> | null;
    category_name?: string | null; 
    amount?: number; 
};

export type ExpenseDetail = EnrichedExpense & {
    // Al detall que ve del servidor, potser encara no tenim els objectes TaxRate complets
    // si no hem fet el join, però per coherència amb el form, podem usar el mateix.
    // Si el servei retorna taxes, fem servir ExpenseItemForm.
    expense_items: ExpenseItemForm[]; 
    expense_attachments: ExpenseAttachment[];
};

// --- 6. VALIDACIÓ ZOD ---
export const expenseItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  description: z.string().min(1, "La descripció és obligatòria"),
  quantity: z.coerce.number().min(0),
  unit_price: z.coerce.number().min(0),
  category_id: z.number().nullable().optional(),
  // Ara Zod també validarà que hi hagi un array (encara que sigui buit)
  taxes: z.array(z.any()).optional().default([]), 
});

export const expenseSchema = z.object({
  id: z.union([z.string(), z.number()]).nullable().optional(),
  description: z.string().min(3, "Mínim 3 caràcters"),
  expense_date: z.string().refine((d) => !isNaN(Date.parse(d)), "Data invàlida"),
  total_amount: z.coerce.number(),
  supplier_id: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
  category_id: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
  invoice_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  payment_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"] as [string, ...string[]]).default("pending"),
  payment_method: z.string().nullable().optional(),
  is_reimbursable: z.boolean().optional(),
  is_billable: z.boolean().optional(),
  currency: z.string().default("EUR"),
  subtotal: z.coerce.number().optional(),
  tax_amount: z.coerce.number().optional(),
  retention_amount: z.coerce.number().optional(),
  discount_amount: z.coerce.number().optional(),
  discount_rate: z.coerce.number().optional(),
  
  // Validem els items amb el nou esquema
  expense_items: z.array(expenseItemSchema).optional().default([]),
});

export type ExpenseSchemaType = z.infer<typeof expenseSchema>;


// AFEGIR AL FINAL DE: src/types/finances/expenses.ts

// --- 7. TIPUS PER A L'IA (OCR) ---
export interface AnalyzedExpenseItem {
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
}

export interface ExpensesAnalysisData {
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null; 
  total_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null; 
  currency: string | null;
  items: AnalyzedExpenseItem[];
  supplier_id: string | null; 
}

// Tipus de retorn de l'acció d'anàlisi
import type { ActionResult } from "@/types/shared/actionResult";
export type ExpensesAnalysisActionResult = ActionResult<ExpensesAnalysisData>;

// --- EXPORTAR EL TIPUS BASE D'ITEM SI ES NECESSITA AL CLIENT ---
// El client de vegades usa el tipus cru de BD abans de convertir-lo a Form
export type ExpenseItem = DbExpenseItem;