'use client';

import { useState, useMemo, useCallback } from 'react';
import { View, NavigateAction } from 'react-big-calendar';
import { toast } from 'sonner';

import { CalendarEvent } from '@/types/crm';
import { EventSourcesState } from '../_components/CalendarClient';
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

    const handleDataFetch = useCallback(async (currentDate: Date, currentView: View) => {
        setIsLoading(true);
        try {
            const { start, end } = getDateRange(currentDate, currentView);

            // Convertim Date → string perquè coincideixi amb la signatura de la funció
            const startDateStr = start.toISOString();
            const endDateStr = end.toISOString();

            const data = await fetchCalendarDataAction(startDateStr, endDateStr, eventSources);

            setTasks(data.tasks ?? []);
            setQuotes(data.quotes ?? []);
            setSentEmails(data.sentEmails ?? []);
            setReceivedEmails(data.receivedEmails ?? []);
        } catch (e) {
            console.error(e);
            toast.error("Error carregant dades del calendari.");
        } finally {
            setIsLoading(false);
        }
    }, [fetchCalendarDataAction, eventSources]);


    const updateDateAndData = useCallback((newDate: Date, newView: View) => {
        setDate(newDate);
        setView(newView);
        handleDataFetch(newDate, newView);
    }, [handleDataFetch]);

    const handleEventSourcesChange = useCallback((newSources: EventSourcesState) => {
        setEventSources(newSources);
        handleDataFetch(date, view);
    }, [date, view, handleDataFetch]);

    const filteredEvents: CalendarEvent[] = useMemo(() => {
        return mapEvents({ tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date });
    }, [tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date]);

    const handleToolbarNavigation = useCallback((action: NavigateAction, newDate?: Date) => {
        const targetDate = newDate ?? new Date();
        updateDateAndData(targetDate, view);
    }, [view, updateDateAndData]);

    const handleCalendarNavigation = useCallback((newDate: Date, currentView: View) => updateDateAndData(newDate, currentView), [updateDateAndData]);
    const handleViewChange = useCallback((newView: View) => updateDateAndData(date, newView), [date, updateDateAndData]);
    const handleMoveTask = useCallback((taskId: number, newDueDate: string) => setTasks(t => t.map(task => task.id === taskId ? { ...task, due_date: newDueDate } : task)), []);
    const handleDataMutation = useCallback(() => handleDataFetch(date, view), [date, view, handleDataFetch]);

    return {
        tasks, filteredEvents, view, date, eventSources, isLoading,
        handleNavigate: handleCalendarNavigation,
        handleToolbarNavigation, handleViewChange, handleDataMutation, handleMoveTask,
        setEventSources, updateDateAndData, handleEventSourcesChange
    };
};
