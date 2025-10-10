/**
 * @file types.ts
 * @summary Tipos centralizados para el módulo de gastos.
 */

export type Supplier = {
  id: string;
  nom: string;
};

export type ExpenseItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

export type ExpenseAttachment = {
  id: string;
  file_path: string;
  filename: string;
  mime_type: string;
};

// Tipus base de despesa
export type Expense = {
  id?: string; // ✅ Opcional (cuando es nueva)
  created_at?: string;
  user_id?: string;
  supplier_id: string | null;
  invoice_number: string | null;
  expense_date: string;
  category: string | null;
  description: string;
  subtotal: number;
  total_amount: number;
  suppliers: Pick<Supplier, 'nom'> | null; // 👈 solo se usa para mostrar nombre
  expense_items: ExpenseItem[];
  expense_attachments: ExpenseAttachment[];
  notes?: string | null;
  discount_amount?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
};

// Estat del formulari (per components React)
export type ExpenseFormState = Omit<Expense, 'suppliers'>;

// Props del diàleg principal
export interface ExpenseDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  initialData: Expense | null;
  suppliers: Supplier[];
}

// Tipus que enviem al servidor amb les accions
export type ExpenseFormDataForAction = Omit<
  Expense,
  'id' | 'created_at' | 'user_id' | 'team_id'
> & {
  id?: string | null;
  expense_items?: ExpenseItem[];
  expense_attachments?: ExpenseAttachment[];
  suppliers?: Pick<Supplier, 'nom'> | null; // 👈 tipus igual que a Expense
};

// Dades que provenen de l'OCR
export type OcrExpenseData = {
  expense_items?: Array<{
    description?: string;
    quantity?: number | string;
    unit_price?: number | string;
  }>;
  issue_date?: string;
  description?: string;
  invoice_number?: string;
  [key: string]: unknown;
};
