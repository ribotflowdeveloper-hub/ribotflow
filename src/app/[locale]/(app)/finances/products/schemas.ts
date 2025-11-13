// src/app/[locale]/(app)/crm/products/schemas.ts
import { z } from "zod";
import type { Database } from "@/types/supabase";

// Copiem el tipus Product aquí si només s'usa relacionat amb l'schema
export type Product = Database["public"]["Tables"]["products"]["Row"];

// Esquema de Zod per al formulari
export const productSchema = z.object({
  name: z.string().min(3, "El nom ha de tenir almenys 3 caràcters."),
  price: z.coerce.number().positive("El preu ha de ser un número positiu."),
  tax_rate: z.coerce
    .number({ invalid_type_error: "Introdueix un número." })
    .min(0, { message: "La taxa no pot ser negativa." })
    .max(1, { message: "La taxa ha de ser un decimal (ex: 0.21 per a 21%)." })
    .nullable()
    .transform((val) => (val === 0 ? null : val)), // Opcional: desar 0 com a null
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

// Tipus per a l'estat de retorn de les accions de formulari
// Pots moure'l a /types/shared/actionResult.ts si és més genèric
export type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
  data?: Product | null; // Product del formulari
};

// Pots definir també el tipus inferit de l'schema si el necessites sovint
export type ProductFormValues = z.infer<typeof productSchema>;
