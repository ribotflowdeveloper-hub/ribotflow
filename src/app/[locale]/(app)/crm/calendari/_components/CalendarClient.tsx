// src/app/[locale]/(app)/crm/calendari/_components/CalendarClient.tsx

'use client';

import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, EventPropGetter, CalendarProps, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { useTranslations } from 'next-intl';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { CalendarEvent } from '@/types/crm';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from './CalendarData';
import { TaskDialogManager } from '@/components/features/tasks/TaskDialogManager';
import { Tables } from '@/types/supabase';
import CalendarToolbar from './CalendarToolbar';
import useCalendar from '../_hooks/useCalendar';
import { QuoteDetailDialog } from './QuoteDetailDialog';
import { EmailDetailDialog } from './EmailDetailDialog';
import { cn } from '@/lib/utils/utils';
import { useCalendarController } from '../_hooks/useCalendarController';
import { useCalendarDialogs } from '../_hooks/useCalendarDialog';
import CalendarSkeleton from './CalendarSkeleton';
import CalendarSkeletonEvent from './CalendarSkeletonEvent'; // Necessari pel renderitzat de skeleton events

// Define the signature of the Server Action (unchanged)
type FetchCalendarDataAction = (startDate: string, endDate: string) => Promise<{
    tasks: EnrichedTaskForCalendar[] | null;
    quotes: EnrichedQuoteForCalendar[] | null;
    sentEmails: EnrichedEmailForCalendar[] | null;
    receivedEmails: EnrichedEmailForCalendar[] | null;
    error?: string;
}>;

export type EventSourcesState = {
    tasks: boolean;
    quotes: boolean;
    emails: boolean;
    receivedEmails: boolean;
};

const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DragAndDropCalendar = withDragAndDrop(Calendar as React.ComponentType<CalendarProps<CalendarEvent>>);
// ✅ CORRECCIÓ CLAU: Declarem les vistes com a constant mutable fora de useMemo.
const CALENDAR_VIEWS: View[] = ['month', 'week', 'day', 'agenda'];

// ✅ CORRECCIÓ: Reubicació dels estils i el style getter aquí
// ✅ Reubicació dels estils i el style getter aquí
const eventStyles = {
    task: {
        Baixa: { backgroundColor: '#3498db', color: 'white' },
        Mitjana: { backgroundColor: '#f1c40f', color: 'black' },
        Alta: { backgroundColor: '#e74c3c', color: 'white' },
    },
    quote: { backgroundColor: '#2ecc71', color: 'white' },
    email: { backgroundColor: '#9b59b6', color: 'white' },
    receivedEmail: { backgroundColor: '#34495e', color: 'white' },
    default: { backgroundColor: '#95a5a6', color: 'white' },
};

const eventStyleGetter: EventPropGetter<CalendarEvent> = (event) => {
    const { eventType, resource } = event;
    let style = { ...eventStyles.default };

    if (eventType === 'task' && resource && typeof resource === 'object' && 'priority' in resource) {
        const priority = (resource as { priority: string }).priority as keyof typeof eventStyles.task;
        style = eventStyles.task[priority] || eventStyles.default;
    } else if (eventType === 'quote') {
        style = eventStyles.quote;
    } else if (eventType === 'email') {
        style = eventStyles.email;
    } else if (eventType === 'receivedEmail') {
        style = eventStyles.receivedEmail;
    }

    return { style: { ...style, borderRadius: '5px', opacity: 0.9, border: '0px', display: 'block' } };
};


export interface CalendarClientProps {
    initialTasks: EnrichedTaskForCalendar[];
    initialQuotes: EnrichedQuoteForCalendar[];
    initialSentEmails: EnrichedEmailForCalendar[];
    initialReceivedEmails: EnrichedEmailForCalendar[];
    teamUsers: { id: string; full_name: string | null }[];
    contacts: Tables<'contacts'>[];
    departments: Tables<'departments'>[];
    fetchCalendarDataAction: FetchCalendarDataAction;
}


export default function CalendarClient(props: CalendarClientProps) {
    const t = useTranslations('Calendar');

    const {
        tasks,
        filteredEvents,
        view,
        date,
        eventSources,
        handleNavigate: handleCalendarNavigation,
        handleToolbarNavigation,
        handleViewChange,
        handleDataMutation,
        handleMoveTask,
        setEventSources,
        updateDateAndData,
        isLoading,
    } = useCalendarController(props);

    const {
        isTaskDialogOpen,
        isQuoteDialogOpen,
        isEmailDialogOpen,
        setIsTaskDialogOpen,
        setIsQuoteDialogOpen,
        setIsEmailDialogOpen,
        selectedTask,
        selectedQuote,
        selectedEmail,
        initialDate,
        handleSelectEvent,
        handleSelectSlot,
        handleOpenNewTaskDialog,
    } = useCalendarDialogs({ updateDateAndData });

    const { handleMoveEvent } = useCalendar(tasks, handleMoveTask);

    // ✅ CORRECCIÓ: Definició COMPLETA del useMemo per localització
    const messages = useMemo(() => ({
        allDay: t('allDay'),
        previous: t('previous'),
        next: t('next'),
        today: t('today'),
        month: t('month'),
        week: t('week'),
        day: t('day'),
        agenda: t('agenda'),
        date: t('date'),
        time: t('time'),
        event: t('event'),
        noEventsInRange: t('noEventsInRange'),
        showMore: (total: number) => `+ ${total} ${t('more')}`,
    }), [t]);


    // 🧠 Racional: Definim les propietats de la Toolbar de forma completa, ja que hereta de ToolbarProps
    const toolbarProps = useMemo(() => ({
        label: messages.month,
        onNavigate: handleToolbarNavigation,
        onView: handleViewChange,
        view: view,
        // ✅ CORRECCIÓ CLAU: Utilitzem 'as const' per fixar el tipus a View[]
        views: CALENDAR_VIEWS, // ✅ Utilitzem la constant mutable
        date: date,
        localizer: localizer,
        // Les nostres custom props
        eventSources: eventSources,
        onEventSourcesChange: setEventSources,
        onCreateTask: handleOpenNewTaskDialog,
    }), [date, view, eventSources, handleToolbarNavigation, handleViewChange, setEventSources, handleOpenNewTaskDialog, messages.month]);

    return (
        <div>
            {/* Toolbar es renderitza sempre per permetre la navegació */}
            <CalendarToolbar
                {...toolbarProps}
            />

            {isLoading ? (
                <CalendarSkeleton />
            ) : (
                <DragAndDropCalendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 'calc(100vh - 150px)' }}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onEventDrop={handleMoveEvent}
                    eventPropGetter={eventStyleGetter}
                    messages={messages}
                    culture="es"
                    view={view}
                    date={date}
                    onView={handleViewChange}
                    onNavigate={handleCalendarNavigation}
                    className={cn('rbc-calendar-force-light-theme')}
                    components={{
                        toolbar: () => null,
                        // ✅ Renderitza el skeleton si l'esdeveniment és de tipus 'skeleton'
                        event: (props) => props.event.eventType === 'skeleton' ? <CalendarSkeletonEvent {...props} /> : <div className="rbc-event-content">{props.title}</div>
                    }}
                />
            )}

            {/* ... (Dialogs unchanged) ... */}
            <TaskDialogManager
                task={selectedTask ? { ...selectedTask, user_id: selectedTask.user_id ?? '' } : null}
                open={isTaskDialogOpen}
                onOpenChange={setIsTaskDialogOpen}
                contacts={props.contacts}
                departments={props.departments}
                teamMembers={props.teamUsers}
                onTaskMutation={handleDataMutation}
                initialDate={initialDate}
            />

            <QuoteDetailDialog
                quote={selectedQuote}
                open={isQuoteDialogOpen}
                onOpenChange={setIsQuoteDialogOpen}
            />

            <EmailDetailDialog
                email={selectedEmail}
                open={isEmailDialogOpen}
                onOpenChange={setIsEmailDialogOpen}
            />
        </div>
    );
}