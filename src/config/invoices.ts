// Mapa de dades per als estats (basat en el teu exemple)
// Adaptat per coincidir amb els valors ENUM de Supabase si els tens,
// o els valors 'text' que fas servir a la columna 'status'.
export const INVOICE_STATUS_MAP = [
 { dbValue: 'Draft',     key: 'draft',   colorClass: 'bg-gray-500/10 text-gray-400 border border-gray-400/30' },
 { dbValue: 'Sent',      key: 'sent',    colorClass: 'bg-blue-500/10 text-blue-400 border border-blue-400/30' }, // Canviat de Issued a Sent per coincidir amb ENUM
 { dbValue: 'Paid',      key: 'paid',    colorClass: 'bg-green-500/10 text-green-400 border border-green-400/30' },
 { dbValue: 'Overdue',   key: 'overdue', colorClass: 'bg-red-500/10 text-red-400 border border-red-400/30' },
 { dbValue: 'Cancelled', key: 'cancelled', colorClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-400/30' }, // Canviat de Cancelled per consistència
] as const;


// Tipus per a l'estat, derivat del mapa o de l'ENUM de Supabase
// Si 'status' a Supabase és ENUM 'invoice_status', pots usar:
// export type InvoiceStatus = Database['public']['Enums']['invoice_status'];
// Si és 'text', definim els valors esperats:
export type InvoiceStatus = typeof INVOICE_STATUS_MAP[number]['dbValue'];