import { z } from 'zod';

// Definim aquí els esquemes, que seran la nostra font de veritat

export const expenseItemSchema = z.object({
  description: z.string().min(1, "La descripció de l'ítem és necessària."),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

export const expenseSchema = z.object({
  description: z.string().min(3, "La descripció ha de tenir almenys 3 caràcters."),
  total_amount: z.number().positive("L'import total ha de ser un número positiu."),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "El format de la data ha de ser AAAA-MM-DD."),
  supplier_id: z.string().uuid("L'ID del proveïdor no és vàlid.").optional().nullable(),
  category: z.string().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  tax_amount: z.number().min(0).optional().nullable(),
  subtotal: z.number().min(0).optional().nullable(),
  discount_amount: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  tax_rate: z.number().min(0).optional().nullable(),
  extra_data: z.any().optional().nullable(),
  expense_items: z.array(expenseItemSchema).optional(),
});

// Definim el tipus de TypeScript a partir de l'esquema per poder-lo reutilitzar
export type ExpenseFormData = z.infer<typeof expenseSchema>;