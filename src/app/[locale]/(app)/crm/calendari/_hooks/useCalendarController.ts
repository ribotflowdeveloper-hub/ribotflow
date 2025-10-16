// src/app/[locale]/(app)/crm/calendari/_hooks/useCalendarController.ts
'use client';

// ✅ Importem només els hooks i funcions que necessitem.
// Hem eliminat useEffect (no era necessari) per optimitzar el rendiment.
import { useState, useMemo, useCallback } from 'react';
import { View, NavigateAction } from 'react-big-calendar';
import { toast } from 'sonner';

// 📅 Llibreria per manipular dates (date-fns)
// Només importem les funcions que realment fem servir.
import {
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    endOfDay, addWeeks, subWeeks,
    addMonths, subMonths,
    addDays, subDays
} from 'date-fns';

import { CalendarEvent } from '@/types/crm';
import {
    EnrichedTaskForCalendar,
    EnrichedQuoteForCalendar,
    EnrichedEmailForCalendar
} from '../_components/CalendarData';
import { EventSourcesState } from '../_components/CalendarClient';

// -------------------------------------------------------------
// 🧠 Tipus i signatures
// -------------------------------------------------------------
// Aquesta acció és una funció asíncrona que rep un rang de dates
// i retorna les dades del calendari (tasques, pressupostos, correus, etc.)
// ✅ CORRECCIÓ: Actualitzem la signatura de l'Action per incloure ActiveSources (que és EventSourcesState)
type FetchCalendarDataAction = (startDate: string, endDate: string, activeSources: EventSourcesState) => Promise<{
    tasks: EnrichedTaskForCalendar[] | null;
    quotes: EnrichedQuoteForCalendar[] | null;
    sentEmails: EnrichedEmailForCalendar[] | null;
    receivedEmails: EnrichedEmailForCalendar[] | null;
    error?: string;
}>;

// Propietats que rep el hook useCalendarController
interface UseCalendarControllerProps {
    initialTasks: EnrichedTaskForCalendar[];
    initialQuotes: EnrichedQuoteForCalendar[];
    initialSentEmails: EnrichedEmailForCalendar[];
    initialReceivedEmails: EnrichedEmailForCalendar[];
    fetchCalendarDataAction: FetchCalendarDataAction;
}

// Tipus de retorn pel hook useCalendarController
interface UseCalendarControllerReturn {
    tasks: EnrichedTaskForCalendar[];
    filteredEvents: CalendarEvent[];
    view: View;
    date: Date;
    eventSources: EventSourcesState;
    isLoading: boolean;
    handleNavigate: (newDate: Date, currentView: View) => void;
    handleToolbarNavigation: (action: NavigateAction, newDate?: Date) => void;
    handleViewChange: (newView: View) => void;
    handleDataMutation: () => Promise<void>;
    handleMoveTask: (taskId: number, newDueDate: string) => void;
    setEventSources: React.Dispatch<React.SetStateAction<EventSourcesState>>;
    updateDateAndData: (newDate: Date, newView: View) => void;
    handleEventSourcesChange: (newSources: EventSourcesState) => void;
}

// -------------------------------------------------------------
// 🔧 Funció auxiliar: calcula el rang de dates segons la vista
// -------------------------------------------------------------
// Aquesta funció permet saber quines dates s'han de consultar a l'API
// depenent si la vista és mensual, setmanal o diària.
const getDateRange = (date: Date, view: View): { start: Date; end: Date } => {
    const weekOptions = { weekStartsOn: 1 as const }; // Dilluns com a inici de setmana

    switch (view) {
        case 'month':
            // Mostrem des de l’inici de la setmana del primer dia del mes
            // fins al final de la setmana del darrer dia del mes.
            return {
                start: startOfWeek(startOfMonth(date), weekOptions),
                end: endOfWeek(endOfMonth(date), weekOptions),
            };
        case 'week':
        case 'agenda':
            // Mostrem tota la setmana actual
            return {
                start: startOfWeek(date, weekOptions),
                end: endOfWeek(date, weekOptions),
            };
        case 'day':
            // Només el dia seleccionat
            return {
                start: date,
                end: endOfDay(date)
            };
        default:
            // Valor per defecte: setmana
            return { start: startOfWeek(date, weekOptions), end: endOfWeek(date, weekOptions) };
    }
};

// -------------------------------------------------------------
// ⚙️ Hook principal: useCalendarController
// -------------------------------------------------------------
export const useCalendarController = ({
    initialTasks,
    initialQuotes,
    initialSentEmails,
    initialReceivedEmails,
    fetchCalendarDataAction,
}: UseCalendarControllerProps): UseCalendarControllerReturn => {

    // 1️⃣ ESTATS DE DADES (rebuts inicialment del server component)
    // Manté les dades del calendari en memòria client.
    const [tasks, setTasks] = useState(initialTasks);
    const [quotes, setQuotes] = useState(initialQuotes);
    const [sentEmails, setSentEmails] = useState(initialSentEmails);
    const [receivedEmails, setReceivedEmails] = useState(initialReceivedEmails);

    // 2️⃣ ESTATS DE CONTROL DE LA UI
    // Guarda la vista actual (mes, setmana o dia) i la data mostrada.
    const [view, setView] = useState<View>('week');
    const [date, setDate] = useState(new Date());

    // Controla quines fonts d’esdeveniments estan activades (tasques, correus, etc.)
    const [eventSources, setEventSources] = useState<EventSourcesState>({
        tasks: true,
        quotes: false,
        emails: false,
        receivedEmails: false,
    });
    // Funció per generar les dates d'una setmana simulada
    const getSkeletonDates = (date: Date): Date[] => {
        const start = startOfWeek(date, { weekStartsOn: 1 as const });
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    };
    // Indica si s’estan carregant dades (per mostrar un “Skeleton” o spinner)
    const [isLoading, setIsLoading] = useState(false);

    // 3️⃣ LÒGICA PRINCIPAL DE CÀRREGA DE DADES
    const handleDataFetch = useCallback(async (currentDate: Date, currentView: View) => {
        setIsLoading(true);

        try {
            const { start, end } = getDateRange(currentDate, currentView);
            const startDateString = start.toISOString();
            const endDateString = end.toISOString();

            // ✅ CANVI CLAU: Passem l'estat actual dels filtres a la Server Action
            const updatedData = await fetchCalendarDataAction(startDateString, endDateString, eventSources);

            if (updatedData.error) {
                // ... (Error handling) ...
                return;
            }

            // Actualitzem l’estat amb les noves dades
            setTasks(updatedData.tasks ?? []);
            setQuotes(updatedData.quotes ?? []);
            setSentEmails(updatedData.sentEmails ?? []);
            setReceivedEmails(updatedData.receivedEmails ?? []);
        } catch (error) {
            console.error("Error durant el fetch de dades del calendari:", error);
            toast.error("Error de xarxa o servidor en carregar dades.");
        } finally {
            setIsLoading(false);
        }
    }, [fetchCalendarDataAction, eventSources]); // ✅ DEPENDÈNCIA CLAU: eventSources

    // Funció auxiliar: actualitza la data/vista i recarrega dades.
    const updateDateAndData = useCallback((newDate: Date, newView: View) => {
        setDate(newDate);
        setView(newView);
        handleDataFetch(newDate, newView);
    }, [handleDataFetch]);

    // 4️⃣ HANDLERS DE NAVEGACIÓ I INTERACCIÓ
    // ✅ NOU HANDLER: Gestiona el canvi de filtre i força la recàrrega de dades per a la vista actual
    const handleEventSourcesChange = useCallback((newSources: EventSourcesState) => {
        // 1. Actualitza l'estat local (necessari per a la propera crida a handleDataFetch)
        setEventSources(newSources);

        // 2. Força la recàrrega de dades amb la data i vista actuals, utilitzant els NOUS filtres.
        // 🧠 Racional: Com que eventSources és una dependència de handleDataFetch,
        // al canviar l'estat de forma síncrona i cridar-lo just després, React utilitza
        // el nou valor de eventSources a la funció re-creada.
        handleDataFetch(date, view);
    }, [date, view, handleDataFetch]); // ⚠️ NOTA: ja no depèn de setEventSources, sinó de handleDataFetch
    
    // Handler per quan l’usuari fa servir la toolbar del calendari (PREV, NEXT, TODAY)
    const handleToolbarNavigation = useCallback((action: NavigateAction, newDate?: Date) => {
        let targetDate: Date;
        const currentView = view;

        if (action === 'TODAY') {
            targetDate = new Date();
        } else if (newDate) {
            targetDate = newDate;
        } else {
            const isPrev = action === 'PREV';
            // Usem date-fns per moure'ns segons la vista actual
            switch (currentView) {
                case 'month':
                    targetDate = isPrev ? subMonths(date, 1) : addMonths(date, 1);
                    break;
                case 'week':
                case 'agenda':
                    targetDate = isPrev ? subWeeks(date, 1) : addWeeks(date, 1);
                    break;
                case 'day':
                    targetDate = isPrev ? subDays(date, 1) : addDays(date, 1);
                    break;
                default:
                    targetDate = date;
            }
        }

        updateDateAndData(targetDate, currentView);
    }, [date, view, updateDateAndData]);

    // Handler per quan el calendari canvia de data des del propi component
    const handleCalendarNavigation = useCallback((newDate: Date, currentView: View) => {
        updateDateAndData(newDate, currentView);
    }, [updateDateAndData]);

    // Handler per canviar de vista (Mes, Setmana, Dia)
    const handleViewChange = useCallback((newView: View) => {
        updateDateAndData(date, newView);
    }, [date, updateDateAndData]);

    // Handler quan una tasca es mou (Drag & Drop)
    // Fa una actualització optimista al client.
    const handleMoveTask = useCallback((taskId: number, newDueDate: string) => {
        setTasks(currentTasks =>
            currentTasks.map(t =>
                t.id === taskId ? { ...t, due_date: newDueDate } : t
            )
        );
    }, []);

    // Handler genèric per tornar a carregar dades després d’una mutació (crear/editar)
    const handleDataMutation = useCallback(async () => {
        handleDataFetch(date, view);
    }, [date, view, handleDataFetch]);

    // 5. MAPATGE DE DADES (Control de Filtres)
    const filteredEvents = useMemo((): CalendarEvent[] => {
        // 🧠 Racional: Si estem carregant, substituïm les dades reals per esdeveniments de tipus 'skeleton'.
        const events: CalendarEvent[] = [];
        if (isLoading) {
            const skeletonDates = getSkeletonDates(date); // Utilitzem la data actual
            const numSkeletons = 15; // Quants esdeveniments de càrrega simulem

            for (let i = 0; i < numSkeletons; i++) {
                const randomDay = skeletonDates[Math.floor(Math.random() * 7)];
                // Clonem la data per evitar modificacions inesperades
                const start = new Date(randomDay);

                events.push({
                    id: `skeleton-${i}`,
                    title: 'Carregant...',
                    start: start,
                    end: start,
                    allDay: true,
                    resource: null,
                    eventType: 'skeleton' // ✅ TIPUS CLAU
                });
            }
            return events;
        }

        // Tasques
        if (eventSources.tasks) {
            tasks.forEach(task => {
                if (task.due_date) {
                    events.push({
                        id: `task-${task.id}`,
                        title: task.title,
                        start: new Date(task.due_date),
                        end: new Date(task.due_date),
                        allDay: true,
                        resource: task,
                        eventType: 'task'
                    });
                }
            });
        }

        // Pressupostos
        if (eventSources.quotes) {
            quotes.forEach(quote => {
                if (quote.expiry_date) {
                    events.push({
                        id: `quote-${quote.id}`,
                        title: `Venciment P.: ${quote.contacts?.nom || 'N/A'}`,
                        start: new Date(quote.expiry_date),
                        end: new Date(quote.expiry_date),
                        allDay: true,
                        resource: quote,
                        eventType: 'quote'
                    });
                }
            });
        }

        // Correus enviats
        if (eventSources.emails) {
            sentEmails.forEach(email => {
                if (email.sent_at) {
                    const recipientName = email.contacts?.nom || email.sender_name || 'Destinatari desconegut';
                    events.push({
                        id: `email-${email.id}`,
                        title: `Correu a: ${recipientName}`,
                        start: new Date(email.sent_at),
                        end: new Date(email.sent_at),
                        allDay: false,
                        resource: email,
                        eventType: 'email'
                    });
                }
            });
        }

        // Correus rebuts
        if (eventSources.receivedEmails) {
            receivedEmails.forEach(email => {
                if (email.sent_at) {
                    const senderName = email.contacts?.nom || email.sender_name || 'Remitent desconegut';
                    events.push({
                        id: `received-${email.id}`,
                        title: `Correu de: ${senderName}`,
                        start: new Date(email.sent_at),
                        end: new Date(email.sent_at),
                        allDay: false,
                        resource: email,
                        eventType: 'receivedEmail'
                    });
                }
            });
        }

        return events;
    }, [tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date]);

    // -------------------------------------------------------------
    // 🎯 Retornem totes les dades i handlers necessaris per al calendari
    // -------------------------------------------------------------
    return {
        tasks,
        filteredEvents,

        // Estats del calendari
        view,
        date,
        eventSources,
        isLoading,

        // Handlers
        handleNavigate: handleCalendarNavigation,  // Navegació interna (DragAndDropCalendar)
        handleToolbarNavigation,                    // Navegació externa (Toolbar)
        handleViewChange,
        handleDataMutation,
        handleMoveTask,
        setEventSources, // ✅ Retornem el setter original per compatibilitat amb React
        updateDateAndData,
        handleEventSourcesChange, // ✅ Exposem el handler personalitzat per recarregar dades amb nous filtres
    };
};
