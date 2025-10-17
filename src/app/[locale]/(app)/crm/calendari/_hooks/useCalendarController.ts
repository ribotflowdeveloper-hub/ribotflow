'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, NavigateAction } from 'react-big-calendar';
import { toast } from 'sonner';

import { CalendarEvent } from '@/types/crm';
import { ActiveSources } from '@/types/crm/calendar';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from '../_components/CalendarData';
import { getDateRange } from './calendarHelpers';
import { fetchCalendarData } from './calendarFetch';
import { mapEvents } from './calendarMapEvents';

interface UseCalendarControllerProps {
    initialTasks: EnrichedTaskForCalendar[];
    initialQuotes: EnrichedQuoteForCalendar[];
    initialSentEmails: EnrichedEmailForCalendar[];
    initialReceivedEmails: EnrichedEmailForCalendar[];
    fetchCalendarDataAction: typeof fetchCalendarData;
}

type EventSourcesState = ActiveSources;

export const useCalendarController = ({
    initialTasks, initialQuotes, initialSentEmails, initialReceivedEmails, fetchCalendarDataAction
}: UseCalendarControllerProps) => {

    const [tasks, setTasks] = useState(initialTasks);
    const [quotes, setQuotes] = useState(initialQuotes);
    const [sentEmails, setSentEmails] = useState(initialSentEmails);
    const [receivedEmails, setReceivedEmails] = useState(initialReceivedEmails);
    const [view, setView] = useState<View>('week');
    const [date, setDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [eventSources, setEventSources] = useState<EventSourcesState>({
        tasks: true, quotes: false, emails: false, receivedEmails: false
    });

    // -------------------------------------------------------------------------
    // 🧠 handleDataFetch: Lògica Asíncrona AÏLLADA
    // Rep l'estat com a argument per evitar problemes de closure.
    // -------------------------------------------------------------------------
    const handleDataFetch = useCallback(async (currentDate: Date, currentView: View, currentSources: EventSourcesState) => {

        console.log('🔄 [Fetch] Iniciant càrrega de dades. Loading=true');
        setIsLoading(true);

        try {
            // Utilitzem els valors passats
            const { start, end } = getDateRange(currentDate, currentView);
            const startDateStr = start.toISOString();
            const endDateStr = end.toISOString();

            console.log('   [Fetch] Sol·licitant dades per al rang:', startDateStr.slice(0, 10), 'a', endDateStr.slice(0, 10));
            console.log('   [Fetch] Filtres enviats a la Server Action:', currentSources);

            const data = await fetchCalendarDataAction(startDateStr, endDateStr, currentSources);

            if (data.error) {
                console.error('   [Fetch] Error del servidor:', data.error);
                toast.error("Error carregant dades del calendari.", { description: data.error });
                setTasks([]);
                setQuotes([]);
                setSentEmails([]);
                setReceivedEmails([]);
                return;
            }

            console.log(`   [Fetch] Dades rebudes. Tasks: ${data.tasks?.length ?? 0}, Quotes: ${data.quotes?.length ?? 0}, Emails: ${data.sentEmails?.length ?? 0}`);

            setTasks(data.tasks ?? []);
            setQuotes(data.quotes ?? []);
            setSentEmails(data.sentEmails ?? []);
            setReceivedEmails(data.receivedEmails ?? []);

        } catch (e) {
            console.error('   [Fetch] Error de xarxa/genèric:', e);
            toast.error("Error carregant dades del calendari (error de xarxa).");
        } finally {
            console.log('   [Fetch] Finalitzant càrrega. Loading=false');
            setIsLoading(false);
        }
    }, [fetchCalendarDataAction]);


    // -------------------------------------------------------------------------
    // 💡 useEffect: L'EFECTE CLAU
    // Dispara handleDataFetch cada vegada que l'estat de control (date, view, eventSources) canvia.
    // -------------------------------------------------------------------------
    useEffect(() => {
        // 💡 La primera càrrega del hook (amb initialData) és redundant, però BigCalendar 
        // sempre farà una navegació inicial, així que la deixem.
        handleDataFetch(date, view, eventSources);
    }, [date, view, eventSources, handleDataFetch]);


    // -------------------------------------------------------------------------
    // 🧭 updateDateAndData: Sols canvia l'estat
    // -------------------------------------------------------------------------
    const updateDateAndData = useCallback((newDate: Date, newView: View) => {
        console.log(`🧭 [Update] Canviant Data/View: ${newDate.toISOString().slice(0, 10)} / ${newView}`);
        // Aquests canvis de setDate/setView dispararan l'useEffect
        setDate(newDate);
        setView(newView);

    }, []);

    // -------------------------------------------------------------------------
    // ⚙️ handleToolbarNavigation: Usat per BigCalendar onNavigate/Toolbar
    // -------------------------------------------------------------------------
    const handleToolbarNavigation = useCallback((action: NavigateAction, newDate: Date) => {
        console.log(`▶️ [Nav] Clic a: ${action}. Nova data suggerida: ${newDate.toISOString().slice(0, 10)}`);
        updateDateAndData(newDate, view);
    }, [view, updateDateAndData]);

    // -------------------------------------------------------------------------
    // 🔄 handleEventSourcesChange: Gestió de Filtres (Només estableix l'estat)
    // -------------------------------------------------------------------------
    const handleEventSourcesChange = useCallback((newSources: EventSourcesState) => {
        console.log('🔘 [Filtre] Canviant filtres a:', newSources);

        // Netejar dades per mostrar l'skeleton (bona UX)
        console.log('   [Filtre] Netejant dades antigues (Wipe)');
        setTasks([]);
        setQuotes([]);
        setSentEmails([]);
        setReceivedEmails([]);

        // El canvi de setEventSources dispararà l'useEffect i la recàrrega.
        setEventSources(newSources);
    }, []); // sense handleDataFetch com a dependència ja que no es crida directament



    // -------------------------------------------------------------------------
    // 🔄 handleViewChange: Gestió de Canvi de Vista
    // -------------------------------------------------------------------------
    const handleViewChange = useCallback((newView: View) => {
        // Només actualitza la vista, l'efecte ho carregarà
        setView(newView);
    }, []);

    const handleMoveTask = useCallback((taskId: number, newDueDate: string) => setTasks(t => t.map(task => task.id === taskId ? { ...task, due_date: newDueDate } : task)), []);

    // Per re-carregar dades després d'una acció (com crear/modificar una tasca)
    const handleDataMutation = useCallback(() => {
        // Crida la funció de càrrega amb l'estat actual per força la recàrrega.
        handleDataFetch(date, view, eventSources);
    }, [date, view, eventSources, handleDataFetch]);

    // -------------------------------------------------------------------------
    // 🧬 filteredEvents: Llista d'esdeveniments per al Calendari (useMemo)
    // -------------------------------------------------------------------------
    const filteredEvents: CalendarEvent[] = useMemo(() => {
        console.log(`✨ [Memo] Recomputant events. Loading: ${isLoading}, Tasks count: ${tasks.length}, Filtres actius: ${Object.entries(eventSources)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(',')
            }`);
        return mapEvents({ tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date });
    }, [tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date]);

    // -------------------------------------------------------------------------
    // 📤 RETORN DEL HOOK
    // -------------------------------------------------------------------------
    return {
        tasks, filteredEvents, view, date, eventSources, isLoading,
        handleToolbarNavigation, handleViewChange, handleDataMutation, handleMoveTask,
        setEventSources: handleEventSourcesChange, // Retorna el callback simple
        updateDateAndData,
    };
};