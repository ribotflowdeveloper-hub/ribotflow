// src/app/[locale]/(app)/crm/calendari/actions.ts
"use server";

import { validatePageSession } from "@/lib/supabase/session";
import { getCalendarEvents } from "@/lib/services/crm/calendar/calendar.service";
import type {
    EnrichedEmailForCalendar,
    EnrichedQuoteForCalendar,
    EnrichedTaskForCalendar,
} from "@/lib/services/crm/calendar/calendar.service";
import type { ActiveSources } from "@/types/crm/calendar";

// ---
// Definim els tipus de retorn que el CLIENT espera
// ---
type CalendarDataPayload = {
    tasks: EnrichedTaskForCalendar[];
    quotes: EnrichedQuoteForCalendar[];
    sentEmails: EnrichedEmailForCalendar[];
    receivedEmails: EnrichedEmailForCalendar[];
    error?: undefined; // ✅ El client espera 'error' opcional (undefined) en cas d'èxit
};

type CalendarErrorPayload = {
    tasks: null;
    quotes: null;
    sentEmails: null;
    receivedEmails: null;
    error: string;
};

type GetCalendarDataResult = Promise<
    CalendarDataPayload | CalendarErrorPayload
>;

/**
 * ACCIÓ: Obté les dades del calendari (per a recàrregues del client).
 */
export async function getCalendarData(
    startDate: string,
    endDate: string,
    activeSources?: ActiveSources,
): GetCalendarDataResult { // ✅ Tipus de retorn aplicat
    const sessionResult = await validatePageSession();
    if ("error" in sessionResult) {
        return {
            tasks: null,
            quotes: null,
            sentEmails: null,
            receivedEmails: null,
            error: "Error de sessió. Torna a iniciar la sessió.",
        };
    }
    const { supabase, activeTeamId } = sessionResult;

    const { data, error } = await getCalendarEvents(
        supabase,
        activeTeamId,
        startDate,
        endDate,
        activeSources,
    );

    if (error || !data) { // Comprovem error O si no hi ha dades
        console.error("Error fetching calendar data (action):", error);

        const errorMessage = error?.validationError ||
            [
                error?.tasksError,
                error?.quotesError,
                error?.sentEmailsError,
                error?.receivedEmailsError,
                error?.membersError,
            ]
                .find((e) => typeof e === "object" && e !== null && e.message)
                ?.message ||
            "Error desconegut al carregar les dades.";

        return {
            tasks: null,
            quotes: null,
            sentEmails: null,
            receivedEmails: null,
            error: errorMessage,
        };
    }

    // ✅ CORRECCIÓ: Retornem l'objecte sense la propietat 'error' (és undefined)
    return {
        tasks: data.tasks ?? [],
        quotes: data.quotes ?? [],
        sentEmails: data.sentEmails ?? [],
        receivedEmails: data.receivedEmails ?? [],
    };
}
