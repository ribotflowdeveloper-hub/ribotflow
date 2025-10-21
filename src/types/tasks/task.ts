
export interface TimeTrackingEntry {
  action: 'start' | 'stop';
  timestamp: string; // Data en format ISO 8601
}
