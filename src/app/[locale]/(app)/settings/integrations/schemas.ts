// src/app/[locale]/(app)/settings/integrations/schemas.ts
import { z } from 'zod';

// Aquest fitxer NO té "use server" perquè s'utilitzarà tant al client com al servidor.

export const ImapSmtpSchema = z.object({
  email: z.string().email({ message: "El correu electrònic no és vàlid." }),
  password: z.string().min(1, { message: "La contrasenya no pot estar buida." }),
  imapHost: z.string().min(1, { message: "El servidor IMAP és requerit." }),
  imapPort: z.coerce.number().min(1, { message: "El port IMAP és requerit." }),
  smtpHost: z.string().min(1, { message: "El servidor SMTP és requerit." }),
  smtpPort: z.coerce.number().min(1, { message: "El port SMTP és requerit." }),
});

export type ImapSmtpFormData = z.infer<typeof ImapSmtpSchema>;