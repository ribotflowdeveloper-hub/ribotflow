export const QUOTE_STATUS_MAP = [
  { dbValue: 'Draft',    key: 'Draft',    colorClass: 'bg-yellow-900/50 text-yellow-300' },
  { dbValue: 'Sent',     key: 'Sent',     colorClass: 'bg-blue-900/50 text-blue-300' },
  { dbValue: 'Accepted', key: 'Accepted', colorClass: 'bg-green-900/50 text-green-300' },
  { dbValue: 'Declined', key: 'Declined', colorClass: 'bg-red-900/50 text-red-300' },
  { dbValue: 'Invoiced', key: 'Invoiced', colorClass: 'bg-purple-900/50 text-purple-300' },
] as const;

export type QuoteStatus = typeof QUOTE_STATUS_MAP[number]['dbValue'];
