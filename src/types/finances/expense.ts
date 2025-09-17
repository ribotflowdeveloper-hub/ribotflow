export type Supplier = { id: string; nom: string };

export type ExpenseItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

export type ExpenseAttachment = {
  file_url: string | undefined;
  id: string;
  file_path: string;
  filename: string;
  mime_type: string;
};

export type Expense = {
  id: string;
  created_at: string;
  user_id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  expense_date: string;
  category: string | null;
  description: string;
  notes: string | null;
  subtotal: number;
  discount_amount: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number;
  // Relations
  suppliers: Supplier | null;
  expense_items: ExpenseItem[];
  expense_attachments: ExpenseAttachment[];
};