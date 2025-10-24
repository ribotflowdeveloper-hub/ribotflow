import CalendarClient from './CalendarClient';
import { validatePageSession } from '@/lib/supabase/session';
import { startOfWeek, endOfWeek } from 'date-fns';

// ✅ 1. Importem el SERVEI per a la càrrega inicial
import { getCalendarPageData } from '@/lib/services/calendar.service';
// ✅ 2. Importem l'ACCIÓ per passar-la al client (per a recàrregues)
import { getCalendarData } from '../actions'; 
// ✅ 3. Importem els tipus des del SERVEI
import { 
  type EnrichedTaskForCalendar,
  type EnrichedQuoteForCalendar,
  type EnrichedEmailForCalendar
} from '@/lib/services/calendar.service';

// Re-exportem tipus per al client
export type { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar };

const INITIAL_ACTIVE_SOURCES = {
  tasks: true,
  quotes: false,
  emails: false,
  receivedEmails: false,
};

export default async function CalendarData() {
  // ✅ 4. Validem la sessió UNA SOLA VEGADA
  const session = await validatePageSession();
  if ('error' in session) {
      console.error(
        'CalendarData: Sessió invàlida.',
        typeof session.error === 'object' && session.error !== null && 'message' in session.error
          ? (session.error as { message?: string }).message
          : session.error
      );
      // Retornem un estat buit si la sessió falla
      return <CalendarClient 
        initialTasks={[]} 
        initialQuotes={[]} 
        initialSentEmails={[]} 
        initialReceivedEmails={[]} 
        teamUsers={[]} 
        contacts={[]} 
        departments={[]} 
        fetchCalendarDataAction={getCalendarData} 
      />;
  }
  const { supabase, activeTeamId } = session;

  const today = new Date();
  const initialStart = startOfWeek(today, { weekStartsOn: 1 as const }).toISOString();
  const initialEnd = endOfWeek(today, { weekStartsOn: 1 as const }).toISOString();
  
  // ✅ 5. Cridem al nostre "Cas d'Ús" del servei per obtenir TOTES les dades inicials
  const { data, error } = await getCalendarPageData(
    supabase, 
    activeTeamId, 
    initialStart, 
    initialEnd, 
    INITIAL_ACTIVE_SOURCES
  );

  // ✅ 6. Gestionem errors
  if (error || !data) {
    console.error('Error carregant dades per al calendari (Component):', error);
    return <CalendarClient 
      initialTasks={[]} 
      initialQuotes={[]} 
      initialSentEmails={[]} 
      initialReceivedEmails={[]} 
      teamUsers={[]} 
      contacts={[]} 
      departments={[]} 
      fetchCalendarDataAction={getCalendarData} 
    />;
  }

  // ✅ 7. Desestructurem les dades netes (events i metadata)
  const { events, metadata } = data;

  return (
    <CalendarClient
      initialTasks={events.tasks ?? []}
      initialQuotes={events.quotes ?? []}
      initialSentEmails={events.sentEmails ?? []}
      initialReceivedEmails={events.receivedEmails ?? []}
      teamUsers={metadata.teamUsers ?? []} 
      contacts={metadata.contacts ?? []} 
      departments={metadata.departments ?? []}
      // Passem l'ACCIÓ (importada de actions.ts) al client per a les recàrregues
      fetchCalendarDataAction={getCalendarData} 
    />
  );
}