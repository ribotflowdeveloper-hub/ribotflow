import { z } from 'zod';

// Esquema de validació per al formulari de proveïdors
export const supplierFormSchema = z.object({
  nom: z.string().min(2, { message: "El nom ha de tenir almenys 2 caràcters." }),
  nif: z.string().optional().nullable(),
  email: z.string().email({ message: "Introdueix un email vàlid." }).optional().nullable(),
  telefon: z.string().optional().nullable(),
  // Pots afegir més camps aquí (adreça, compte bancari, etc.)
  // address: z.string().optional().nullable(),
  // bank_iban: z.string().optional().nullable(),
});

// Tipus inferit de l'esquema
export type SupplierFormValues = z.infer<typeof supplierFormSchema>;