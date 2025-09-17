

// ✅ AFEGEIX AQUEST NOU MAPA PER ALS ESTATS DE LES FACTURES
export const INVOICE_STATUS_MAP = [
    { dbValue: 'Draft',   key: 'draft',   colorClass: 'bg-gray-500/10 text-gray-400 border border-gray-400/30' },
    { dbValue: 'Issued',  key: 'issued',  colorClass: 'bg-purple-500/10 text-purple-400 border border-purple-400/30' },
    { dbValue: 'Paid',    key: 'paid',    colorClass: 'bg-green-500/10 text-green-400 border border-green-400/30' },
    { dbValue: 'Overdue', key: 'overdue', colorClass: 'bg-red-500/10 text-red-400 border border-red-400/30' },
  ] as const;
  
  // Creem un tipus segur per als valors de la base de dades
  type InvoiceStatus = typeof INVOICE_STATUS_MAP[number]['dbValue'];
  
  // Modifiquem el tipus Invoice per utilitzar-lo
  export type Invoice = { 
    id: string; 
    invoice_number: string; 
    status: InvoiceStatus; // ✅ Ara utilitza el tipus segur
    total: number; 
  };