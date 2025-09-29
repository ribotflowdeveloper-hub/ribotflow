/**
 * @file src/types/crm/inbox.ts
 * @summary Defineix els tipus de dades per a l'Inbox (Tiquets, Plantilles) i Activitats.
 */

import { z } from 'zod';
import type { Contact } from '../crm/index';

// --- MAPA I TIPUS D'ESTAT DE TIQUET ---


export const TICKET_STATUS_MAP = [
  // ✅ CANVI: D'"Obert" a "NoLlegit"
  { dbValue: 'NoLlegit', key: 'unread' }, 
  { dbValue: 'Llegit', key: 'read' },
  { dbValue: 'Respost', key: 'replied' },
] as const;
export type TicketStatus = typeof TICKET_STATUS_MAP[number]['dbValue'];

// --- TIPUS PRINCIPALS (AMB ZOD PER A MÉS SEGURETAT) ---
export type TicketFilter = 'tots' | 'rebuts' | 'enviats' | 'noLlegits';

// Esquema de validació per a un Tiquet
export const ticketSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable(),
  
  sender_name: z.string().nullable(),
  sender_email: z.string().email(), // L'email ha de ser un string vàlid
  subject: z.string().nullable(),
  preview: z.string().nullable(),
  
  sent_at: z.string().datetime(),
  status: z.custom<TicketStatus>(), // Ha de ser 'Obert', 'Llegit', o 'Respost'
  type: z.enum(['rebut', 'enviat']), // Ha de ser 'rebut' o 'enviat'
  body: z.string().optional().nullable(),
  contacts: z.custom<Contact>().nullable(),
});

export type Ticket = z.infer<typeof ticketSchema>;

// Tipus que representa les dades en brut que arriben de la funció RPC
export type TicketFromRpc = {
  id: number;
  user_id: string;
  subject: string | null;
  body: string | null;
  status: string | null;
  provider_message_id: string | null;
  type: string | null;
  preview: string | null;
  sent_at: string | null;
  sender_name: string | null;
  sender_email: string | null;
  created_at: string;
  contact_id: string | null;
  provider: string | null;
  attachments: unknown;
  // ✅ CORRECCIÓ: AFEGIT el camp 'empresa' per coincidir amb la funció SQL
  contacts: { id: string; nom: string; email: string; empresa: string | null; } | null;
  assignment: { deal_id: string | null } | null;
};


/**
 * ✅ NOU: Funció transformadora que converteix de manera segura un objecte RPC a un tipus Ticket.
 * Aquesta funció és la clau per resoldre tots els errors de tipus.
 */
export function transformRpcToTicket(t: TicketFromRpc): Ticket {
  // Llista de valors permesos per a 'status'
  const validStatusValues = TICKET_STATUS_MAP.map(s => s.dbValue);

  return {
    ...t,
    // --- Normalització de camps que no poden ser nuls a Zod ---
    sender_email: t.sender_email ?? 'desconegut@email.com',
    sent_at: t.sent_at ?? new Date().toISOString(),

    // --- Normalització de camps amb valors restringits (enums) ---
    status: (validStatusValues.includes(t.status as TicketStatus) ? t.status : 'Obert') as TicketStatus,
    type: (t.type === 'enviat' ? 'enviat' : 'rebut'), // Si no és 'enviat', per defecte és 'rebut'
    
    // --- Assegurem que els camps que poden ser nuls es mantinguin ---
    sender_name: t.sender_name,
    subject: t.subject,
    preview: t.preview,
    contact_id: t.contact_id,
    body: t.body,
    contacts: t.contacts,
  };
}

// ... (la resta de tipus com templateSchema, activitySchema, etc. es mantenen iguals)
export const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  variables: z.array(z.string()).nullable(),
});
export type Template = z.infer<typeof templateSchema>;

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