'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, NavigateAction } from 'react-big-calendar';
import { toast } from 'sonner';
// 💡 Imports NETEJATS: Només mantenim les funcions necessàries per al càlcul manual de dates
import { 
    startOfToday, 
    addDays, addWeeks, addMonths 
} from 'date-fns';

import { CalendarEvent } from '@/types/crm';
import { ActiveSources } from '@/types/crm/calendar';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from '../_components/CalendarData';
import { getDateRange } from './calendarHelpers';
import { fetchCalendarData } from './calendarFetch';
import { mapEvents } from './calendarMapEvents';

// Hem eliminat la definició de 'localizer' ja que no s'utilitzava directament.


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
    // -------------------------------------------------------------------------
    const handleDataFetch = useCallback(async (currentDate: Date, currentView: View, currentSources: EventSourcesState) => {
        
        console.log('🔄 [Fetch] Iniciant càrrega de dades. Loading=true');
        setIsLoading(true); 
        
        try {
            const { start, end } = getDateRange(currentDate, currentView);
            const startDateStr = start.toISOString();
            const endDateStr = end.toISOString();

            console.log('   [Fetch] Sol·licitant dades per al rang:', startDateStr.slice(0, 10), 'a', endDateStr.slice(0, 10));

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

    
    // 💡 useEffect: SINCRONITZADOR D'ESTAT (Dispara la càrrega quan l'estat canvia)
    useEffect(() => {
        handleDataFetch(date, view, eventSources);
    }, [date, view, eventSources, handleDataFetch]);


    // -------------------------------------------------------------------------
    // 🧭 updateDateAndData: Sols canvia l'estat
    // -------------------------------------------------------------------------
    const updateDateAndData = useCallback((newDate: Date, newView: View) => {
        console.log(`🧭 [Update] Canviant Data/View: ${newDate.toISOString().slice(0,10)} / ${newView}`);
        setDate(newDate);
        setView(newView);
        
    }, []);

    // -------------------------------------------------------------------------
    // ⚙️ handleToolbarNavigation: Gestió Unificada (FIX CLAU)
    // -------------------------------------------------------------------------
    const handleToolbarNavigation = useCallback((action: NavigateAction, newDate?: Date) => {
        let targetDate: Date;
        
        console.log(`▶️ [Nav] Clic a: ${action}. Nova data suggerida: ${newDate ? newDate.toISOString().slice(0,10) : 'CALCULANT...'}`);

        // 1. Check if newDate is provided (Internal R-B-C navigation)
        if (newDate) {
            targetDate = newDate;
        } else {
            // 2. If newDate is NOT provided (External Toolbar navigation), calculate it manually.
            
            const currentDate = date;
            const multiplier = (action === 'NEXT' ? 1 : -1);

            switch (action) {
                case 'TODAY':
                    targetDate = startOfToday();
                    break;
                case 'NEXT':
                case 'PREV':
                    // Utilitzem les funcions primitives de date-fns segons la vista
                    switch (view) {
                        case 'month':
                            targetDate = addMonths(currentDate, multiplier);
                            break;
                        case 'week':
                            targetDate = addWeeks(currentDate, multiplier);
                            break;
                        case 'day':
                            targetDate = addDays(currentDate, multiplier);
                            break;
                        case 'agenda':
                            // Per a l'agenda, utilitzem navegació mensual
                            targetDate = addMonths(currentDate, multiplier);
                            break;
                        default:
                            targetDate = currentDate; 
                    }
                    break;
                default:
                    targetDate = currentDate;
            }
        }
        
        // Finalment, actualitzem la data (targetDate ja és vàlida) i la vista
        updateDateAndData(targetDate, view);
        
    }, [view, updateDateAndData, date]); 


    // -------------------------------------------------------------------------
    // 🔄 handleEventSourcesChange: Gestió de Filtres
    // -------------------------------------------------------------------------
    const handleEventSourcesChange = useCallback((newSources: EventSourcesState) => {
        console.log('🔘 [Filtre] Canviant filtres a:', newSources);

        console.log('   [Filtre] Netejant dades antigues (Wipe)');
        setTasks([]);
        setQuotes([]);
        setSentEmails([]);
        setReceivedEmails([]);
        
        setEventSources(newSources); 
        
    }, []);

    // -------------------------------------------------------------------------
    // 🔄 handleViewChange: Gestió de Canvi de Vista
    // -------------------------------------------------------------------------
    const handleViewChange = useCallback((newView: View) => {
        setView(newView); 
    }, []);

    const handleMoveTask = useCallback((taskId: number, newDueDate: string) => setTasks(t => t.map(task => task.id === taskId ? { ...task, due_date: newDueDate } : task)), []);
    
    // Per re-carregar dades després d'una acció (mutació)
    const handleDataMutation = useCallback(() => {
        handleDataFetch(date, view, eventSources);
    }, [date, view, eventSources, handleDataFetch]);

    // -------------------------------------------------------------------------
    // 🧬 filteredEvents: Llista d'esdeveniments per al Calendari (useMemo)
    // -------------------------------------------------------------------------
    const filteredEvents: CalendarEvent[] = useMemo(() => {
        console.log(`✨ [Memo] Recomputant events...`);
        return mapEvents({ tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date });
    }, [tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date]);
    
    // -------------------------------------------------------------------------
    // 📤 RETORN DEL HOOK
    // -------------------------------------------------------------------------
    return {
        tasks, filteredEvents, view, date, eventSources, isLoading,
        handleToolbarNavigation, handleViewChange, handleDataMutation, handleMoveTask,
        setEventSources: handleEventSourcesChange,
        updateDateAndData,
    };
};