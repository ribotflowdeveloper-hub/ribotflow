// src/config/inbox.ts (NOU FITXER)

/**
 * @summary Defineix les constants i la lògica de negoci per al mòdul de l'Inbox.
 */

// Mapa d'estats de tiquets. La 'font de la veritat' per als estats possibles.
export const TICKET_STATUS_MAP = [
  { dbValue: 'NoLlegit', key: 'unread' }, 
  { dbValue: 'Llegit', key: 'read' },
  { dbValue: 'Respost', key: 'replied' },
] as const;

// Tipus que representa els possibles valors de l'estat d'un tiquet a la base de dades.
export type TicketStatus = typeof TICKET_STATUS_MAP[number]['dbValue'];

// Tipus per als filtres de la interfície d'usuari.
export type TicketFilter = 'tots' | 'rebuts' | 'enviats' | 'noLlegits';