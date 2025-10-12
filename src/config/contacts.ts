// src/config/contacts.ts (NOU FITXER)

export const CONTACT_STATUS_MAP = [
  { code: 'L', key: 'Lead' },
  { code: 'P', key: 'Proveidor' },
  { code: 'C', key: 'Client' },
] as const;

export type ContactStatusCode = typeof CONTACT_STATUS_MAP[number]['code'];