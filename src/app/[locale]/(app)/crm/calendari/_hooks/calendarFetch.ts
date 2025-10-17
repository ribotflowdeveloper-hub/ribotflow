// src/app/[locale]/(app)/crm/calendari/_hooks/calendarFetch.ts
import { ActiveSources } from '@/types/crm'; // Importem el tipus ActiveSources si és allà on el tens definit (o hauria de ser al teu types/crm/calendar.ts)
// ⚠️ IMPORTANT: Importem la funció Server Action real, que has anomenat getCalendarData
import { getCalendarData } from '../actions'; 

// El tipus EventSourcesState hauria de ser ActiveSources (per coherència amb la Server Action)
export const fetchCalendarData = async (
  startDate: string,
  endDate: string,
  eventSources: ActiveSources // 🧠 Passem l'estat dels filtres
) => {
  // Crida la Server Action amb tots els paràmetres necessaris
  const data = await getCalendarData(startDate, endDate, eventSources);

  // 🚨 Gestió d'errors: L'acció del servidor ja retorna un objecte amb 'error', l'hem de propagar o gestionar.
  if (data.error) {
    // Aquí podríem llençar un error o retornar l'estructura d'error
    // Però pel patró actual de useCalendarController que espera null en cas d'error,
    // retornem l'estructura de dades amb nulls.
    return {
      tasks: null,
      quotes: null,
      sentEmails: null,
      receivedEmails: null,
      error: data.error
    };
  }

  // ✅ Retornem les dades obtingudes
  return {
    tasks: data.tasks ?? [],
    quotes: data.quotes ?? [],
    sentEmails: data.sentEmails ?? [],
    receivedEmails: data.receivedEmails ?? [],
  };
};

// ⚠️ Recordatori: Si ActiveSources no està definit a ../actions.ts, has de crear un fitxer de tipus
// per a CalendarEvent i ActiveSources (ex: src/types/crm/calendar.ts) i importar-lo allà.
// Per ara, assumim que està correctament importat a través de CalendarClient.