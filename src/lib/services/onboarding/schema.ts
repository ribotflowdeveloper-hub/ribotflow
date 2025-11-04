import { z } from 'zod';

export const OnboardingSchema = z.object({
  full_name: z.string().min(3, "El nom complet és obligatori."),
  company_name: z.string().min(2, "El nom de l'empresa és obligatori."),
  tax_id: z.string().optional(),
  website: z.string().url("Introdueix una URL vàlida.").optional().or(z.literal('')),
  summary: z.string().optional(),
  sector: z.string().optional(),
  services: z.array(z.string()).min(1, "Has de seleccionar almenys un servei."),
  phone: z.string().optional(),
  street: z.string().min(1, "El carrer és obligatori."),
  city: z.string().min(1, "La ciutat és obligatòria."),
  postal_code: z.string().min(1, "El codi postal és obligatori."),
  region: z.string().min(1, "La regió és obligatòria."),
  country: z.string().min(1, "El país és obligatori."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type OnboardingFormData = z.infer<typeof OnboardingSchema>;
