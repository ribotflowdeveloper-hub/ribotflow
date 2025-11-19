import { z } from "zod";
import type { 
  Expense as DbExpense, 
  ExpenseItem as DbExpenseItem,
  ExpenseCategory as DbExpenseCategory,
  ExpenseAttachment as DbExpenseAttachment,
  Contact,
} from "@/types/db";

// Si tens el tipus TaxRate definit en un altre lloc, importa'l. 
// Si no, el definim aquí o l'importem de 'taxes.ts' si existeix.
// import type { TaxRate } from "./taxes"; 
// Per si de cas no el tens, el defineixo aquí breument (ajusta'l al teu real):
export type TaxRate = {
    id: number;
    name: string;
    percentage: number;
    is_default?: boolean;
};

// --- 1. TIPUS BASE (BD) ---
export type Expense = DbExpense;
export type ExpenseCategory = DbExpenseCategory;
export type ExpenseAttachment = DbExpenseAttachment;

// --- 2. TIPUS DE FORMULARI (UI) ---

// ✅ CORRECCIÓ CLAU: Estenem el tipus de la BD per afegir-hi 'taxes'
// Aquest és el tipus que utilitzarà el hook useExpenseDetail
export type ExpenseItemForm = Omit<DbExpenseItem, 'id'> & {
    // L'ID pot ser string (UUID temporal) o number (BD), o undefined si és nou
    id?: string | number; 
    
    // Afegim la propietat que faltava i que donava error
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