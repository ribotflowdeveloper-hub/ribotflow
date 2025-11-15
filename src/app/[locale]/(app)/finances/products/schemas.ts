// src/app/[locale]/(app)/crm/products/schemas.ts
import { z } from "zod";
import type { Database } from "@/types/supabase";

// Copiem el tipus Product aquí si només s'usa relacionat amb l'schema
export type Product = Database["public"]["Tables"]["products"]["Row"];

// Esquema de Zod per al formulari
export const productSchema = z.object({
  name: z.string().min(1, { message: "El nom és obligatori." }),
  description: z.string().nullable().optional(),
  price: z.coerce.number().min(0, { message: "El preu ha de ser positiu." }),
  sku: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  
  // 🚫 ELIMINAT: tax_rate: z.coerce.number().nullable().optional(),
  // 🚫 ELIMINAT: discount: z.coerce.number().nullable().optional(),

  // ✅ NOU: Acceptarem els impostos com un string separat per comes
  tax_ids: z.string().optional(), 
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
