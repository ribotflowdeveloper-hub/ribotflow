/**
 * @file src/types/crm/inbox.ts
 * @summary Defineix els tipus de dades per a l'Inbox (Tiquets, Plantilles) i Activitats.
 */

import { z } from 'zod';
import type { Contact } from '../crm/index';

// --- MAPA I TIPUS D'ESTAT DE TIQUET ---

export const TICKET_STATUS_MAP = [
    { dbValue: 'Obert', key: 'open' },
    { dbValue: 'Llegit', key: 'read' },
    { dbValue: 'Respost', key: 'replied' },
] as const;
type TicketStatus = typeof TICKET_STATUS_MAP[number]['dbValue'];

// --- TIPUS PRINCIPALS (AMB ZOD PER A MÉS SEGURETAT) ---
export type TicketFilter = 'tots' | 'rebuts' | 'enviats' | 'noLlegits';

// Esquema de validació per a un Tiquet
export const ticketSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable(),
  sender_name: z.string(),
  sender_email: z.string().email(),
  subject: z.string(),
  preview: z.string(),
  sent_at: z.string().datetime(),
  status: z.custom<TicketStatus>(),
  type: z.enum(['rebut', 'enviat']),
  body: z.string().optional().nullable(),
  contacts: z.custom<Contact>().nullable(),
});

// Tipus de TypeScript generat a partir de l'esquema de Zod
export type Ticket = z.infer<typeof ticketSchema>;

// Esquema i tipus per a una Plantilla d'email
export const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  variables: z.array(z.string()).nullable(),
});

export type Template = z.infer<typeof templateSchema>;

// Esquema i tipus per a una Activitat
export const activitySchema = z.object({
    id: z.string(),
    created_at: z.string(),
    type: z.string(),
    content: z.string(),
    is_read: z.boolean(),
    contact_id: z.string().nullable(),
    contact_name: z.string().nullable(),
    contact_email: z.string().nullable(),
    contacts: z.object({ nom: z.string().nullable() }).nullable(),
});

export type Activity = z.infer<typeof activitySchema>;