/**
 * @file types.ts (Despeses)
 * @summary Fichero centralizado para las definiciones de tipos del módulo de gastos.
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
  
  export type Expense = {
    id: string;
    created_at: string;
    user_id: string;
    supplier_id: string | null;
    invoice_number: string | null;
    expense_date: string;
    category: string | null; // Podríamos aplicar el patrón de MAPA aquí en el futuro
    description: string;
    subtotal: number;
    total_amount: number;
    suppliers: Pick<Supplier, 'nom'> | null; // Solo necesitamos el nombre para la lista inicial
    expense_items: ExpenseItem[];
    expense_attachments: ExpenseAttachment[]; 
    notes?: string | null;
    discount_amount?: number | null;
    tax_rate?: number | null;
    tax_amount?: number | null;
  };