export const QUOTE_STATUS_MAP = [
  { dbValue: 'Draft',    key: 'draft',    colorClass: 'bg-yellow-900/50 text-yellow-300' },
  { dbValue: 'Sent',     key: 'sent',     colorClass: 'bg-blue-900/50 text-blue-300' },
  { dbValue: 'Accepted', key: 'accepted', colorClass: 'bg-green-900/50 text-green-300' },
  { dbValue: 'Declined', key: 'declined', colorClass: 'bg-red-900/50 text-red-300' },
] as const;

export type QuoteStatus = typeof QUOTE_STATUS_MAP[number]['dbValue'];
