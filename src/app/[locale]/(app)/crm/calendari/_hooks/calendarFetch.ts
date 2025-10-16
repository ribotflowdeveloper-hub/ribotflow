import { EventSourcesState } from '../_components/CalendarClient';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from '../_components/CalendarData';

export const fetchCalendarData = async (
  startDate: string,
  endDate: string,
  _eventSources: EventSourcesState
) => {
  // Aquí crides la teva Server Action amb startDate/endDate
  // Exemple simplificat:
  return {
    tasks: [] as EnrichedTaskForCalendar[],
    quotes: [] as EnrichedQuoteForCalendar[],
    sentEmails: [] as EnrichedEmailForCalendar[],
    receivedEmails: [] as EnrichedEmailForCalendar[],
  };
};
