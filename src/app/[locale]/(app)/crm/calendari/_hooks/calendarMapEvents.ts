import { CalendarEvent } from '@/types/crm';
import { EventSourcesState } from '../_components/CalendarClient';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from '../_components/CalendarData';
import { addDays, startOfWeek } from 'date-fns';

interface MapEventsParams {
  tasks: EnrichedTaskForCalendar[];
  quotes: EnrichedQuoteForCalendar[];
  sentEmails: EnrichedEmailForCalendar[];
  receivedEmails: EnrichedEmailForCalendar[];
  eventSources: EventSourcesState;
  isLoading: boolean;
  date: Date;
}

export const mapEvents = ({
  tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date
}: MapEventsParams): CalendarEvent[] => {

  if (isLoading) {
    const skeletonDates = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date, { weekStartsOn: 1 }), i));
    return Array.from({ length: 15 }, (_, i) => {
      const d = skeletonDates[Math.floor(Math.random() * 7)];
      return { id: `skeleton-${i}`, title: 'Carregant...', start: d, end: d, allDay: true, resource: null, eventType: 'skeleton' };
    });
  }

  const events: CalendarEvent[] = [];
  type EventType = 'skeleton' | 'task' | 'quote' | 'email' | 'receivedEmail';

  const addEvent = <T extends { id: number }>(
    source: T[],
    type: EventType,
    getDate: (item: T) => Date | null,
    getTitle: (item: T) => string
  ) => {
    source.forEach(item => {
      const d = getDate(item);
      if (d) events.push({ id: `${type}-${item.id}`, title: getTitle(item), start: d, end: d, allDay: type !== 'email' && type !== 'receivedEmail', resource: item, eventType: type });
    });
  };

  if (eventSources.tasks) addEvent(tasks, 'task', t => t.due_date ? new Date(t.due_date) : null, t => t.title);
  if (eventSources.quotes) addEvent(quotes, 'quote', q => q.expiry_date ? new Date(q.expiry_date) : null, q => `Venciment P.: ${q.contacts?.nom || 'N/A'}`);
  if (eventSources.emails) addEvent(sentEmails, 'email', e => e.sent_at ? new Date(e.sent_at) : null, e => `Correu a: ${e.contacts?.nom || e.sender_name || 'Destinatari desconegut'}`);
  if (eventSources.receivedEmails) addEvent(receivedEmails, 'receivedEmail', e => e.sent_at ? new Date(e.sent_at) : null, e => `Correu de: ${e.contacts?.nom || e.sender_name || 'Remitent desconegut'}`);

  return events;
};
