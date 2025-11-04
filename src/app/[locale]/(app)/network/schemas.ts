// /app/[locale]/network/schemas.ts (FITXER NOU)
import { z } from "zod";

export const CreateJobPostingSchema = z.object({
  team_id: z.string().uuid("ID d'equip invàlid"),
  title: z.string().min(5, "El títol ha de tenir almenys 5 caràcters"),
  description: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address_text: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  required_skills: z.preprocess(
    (val) => (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : val),
    z.array(z.string()).optional()
  ),
  budget: z.coerce.number().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

// Tipus inferit per al formulari
export type CreateJobPostingData = z.infer<typeof CreateJobPostingSchema>;