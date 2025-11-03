// src/types/crm/inbox.ts
import { z } from 'zod';
// 1. Encara importem 'Contact' per si el necessitem en altres llocs,
//    però no el farem servir al 'ticketSchema' directament.
import { TicketStatus, TICKET_STATUS_MAP} from '@/config/inbox';

// --- TIPUS PRINCIPALS ---
export type TicketFilter = 'tots' | 'rebuts' | 'enviats' | 'noLlegits';

// ✅ SOLUCIÓ 1: Definim un esquema Zod per al *que realment rebem* de l'RPC.
// Aquest objecte NO és un 'Contact' complet.
const rpcContactSchema = z.object({
  id: z.number(), // ✅ CORRECCIÓ: L'ID de la BD sempre és 'number', no 'string'
  nom: z.string(),
  email: z.string(),
  empresa: z.string().nullable(),
}).nullable();

// Esquema de validació per a un Tiquet
export const ticketSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  // Aquest contact_id és un UUID (string), és correcte si la teva taula 'tickets' el té com a text
  contact_id: z.string().uuid().nullable(), 
  
  sender_name: z.string().nullable(),
  sender_email: z.string().email(),
  subject: z.string().nullable(),
  preview: z.string().nullable(),
  
  sent_at: z.string().datetime(),
  status: z.custom<TicketStatus>(),
  type: z.enum(['rebut', 'enviat']),
  body: z.string().optional().nullable(),
  
  // ✅ SOLUCIÓ 2: Utilitzem l'esquema parcial 'rpcContactSchema'
  // en lloc de 'z.custom<Contact>()'
  contacts: rpcContactSchema, 
});

// El 'Ticket' inferit ara espera el tipus correcte
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
  contacts: { 
    // ✅ CORRECCIÓ: L'ID ha de ser 'number'
    id: number; 
    nom: string; 
    email: string; 
    empresa: string | null; 
  } | null;
  assignment: { deal_id: string | null } | null;
};


/**
 * Funció transformadora que converteix de manera segura un objecte RPC a un tipus Ticket.
 * Ara, 't.contacts' (amb id: number) coincideix amb el que 'ticketSchema' espera.
 */
export function transformRpcToTicket(t: TicketFromRpc): Ticket {
  const validStatusValues = TICKET_STATUS_MAP.map(s => s.dbValue);

  return {
    ...t,
    sender_email: t.sender_email ?? 'desconegut@email.com',
    sent_at: t.sent_at ?? new Date().toISOString(),
    status: (validStatusValues.includes(t.status as TicketStatus) ? t.status : 'Obert') as TicketStatus,
    type: (t.type === 'enviat' ? 'enviat' : 'rebut'),
    
    // Aquests camps ara són compatibles
    sender_name: t.sender_name,
    subject: t.subject,
    preview: t.preview,
    contact_id: t.contact_id,
    body: t.body,
    contacts: t.contacts, // ✅ Això ara funciona!
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