/**
 * @file src/types/crm/index.ts
 * @summary Aquest és un "fitxer barril" que re-exporta tots els tipus del domini CRM.
 * Això permet que la resta de l'aplicació importi qualsevol tipus del CRM des d'un sol lloc,
 * mantenint l'organització interna en mòduls.
 * * @example
 * import type { Contact, Quote, Ticket } from '@/types/crm';
 */
export * from './opportunitys';
export * from './contacts';
export * from '../comunicacio/inbox';
export * from './general';
export * from './products';
export * from './deals';
export * from './quotes';
export * from './pipelines';
export * from '../shared/notification';
export * from './calendar';