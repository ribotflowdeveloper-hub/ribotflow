'use client';

import { useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, EventPropGetter, CalendarProps, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { useTranslations } from 'next-intl';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { CalendarEvent } from '@/types/crm';
// 🔑 Imports afegits per la coherència de tipus (fetchCalendarDataAction)
import { fetchCalendarData } from '../_hooks/calendarFetch';
import { ActiveSources } from '@/types/crm/calendar';
// ----------------------------------------------------------------------
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
import CalendarSkeletonEvent from './CalendarSkeletonEvent';

// 🔑 FIX: Exportem el tipus EventSourcesState
export type EventSourcesState = ActiveSources;

const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DragAndDropCalendar = withDragAndDrop(Calendar as React.ComponentType<CalendarProps<CalendarEvent>>);
const CALENDAR_VIEWS: View[] = ['month', 'week', 'day', 'agenda'];

// 🎨 DEFINICIONS D'ESTILS
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

// ----------------------------------------------------------------------
// 📦 INTERFÍCIE DE PROPIETATS
// ----------------------------------------------------------------------
export interface CalendarClientProps {
    initialTasks: EnrichedTaskForCalendar[];
    initialQuotes: EnrichedQuoteForCalendar[];
    initialSentEmails: EnrichedEmailForCalendar[];
    initialReceivedEmails: EnrichedEmailForCalendar[];
    teamUsers: { id: string; full_name: string | null }[];
    contacts: Tables<'contacts'>[];
    departments: Tables<'departments'>[];
    fetchCalendarDataAction: typeof fetchCalendarData;
}

// ----------------------------------------------------------------------
// ⚙️ COMPONENT PRINCIPAL
// ----------------------------------------------------------------------
export default function CalendarClient(props: CalendarClientProps) {
    const t = useTranslations('Calendar');

    const {
        tasks,
        filteredEvents,
        view,
        date,
        eventSources,
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

    const formattedLabel = useMemo(() => {
        let dateFormat: string;
        switch (view) {
            case 'month': dateFormat = 'MMMM yyyy'; break;
            case 'week': dateFormat = 'dd MMM yyyy'; break;
            case 'day': dateFormat = 'EEEE, dd MMMM yyyy'; break;
            case 'agenda': dateFormat = 'dd MMMM yyyy'; break;
            default: dateFormat = 'MMMM yyyy';
        }
        return format(date, dateFormat, { locale: es }).replace(/^\w/, c => c.toUpperCase());
    }, [date, view]);
    
    // -------------------------------------------------------------------------
    // 🔑 ADAPTADOR 1: Per a react-big-calendar (envia newDate, view, action)
    // -------------------------------------------------------------------------
    const handleCalendarNavigate: CalendarProps<CalendarEvent>['onNavigate'] = useCallback((newDate: Date, view: View, action: NavigateAction) => {
        // BigCalendar ha calculat la newDate. La passem al hook.
        handleToolbarNavigation(action, newDate);
    }, [handleToolbarNavigation]);
    
    // -------------------------------------------------------------------------
    // 🔑 ADAPTADOR 2: Per a CalendarToolbar (envia només action)
    // -------------------------------------------------------------------------
    const handleToolbarAction = useCallback((action: NavigateAction) => {
        // La Toolbar només envia l'acció. Passem 'undefined' com a newDate, 
        // forçant que el hook la calculi.
        handleToolbarNavigation(action, undefined);
    }, [handleToolbarNavigation]);


    const toolbarProps = useMemo(() => ({
        label: formattedLabel,
        // 🔑 Utilitzem l'adaptador simple per la Toolbar
        onNavigate: handleToolbarAction, 
        onView: handleViewChange,
        view: view,
        views: CALENDAR_VIEWS,
        date: date,
        localizer: localizer,
        onEventSourcesChange: setEventSources,
        eventSources: eventSources, // Fix: Ensure eventSources is passed here
        onCreateTask: handleOpenNewTaskDialog,
    }), [formattedLabel, handleViewChange, view, date, eventSources, setEventSources, handleOpenNewTaskDialog, handleToolbarAction]);

    return (
        <div>
            <CalendarToolbar {...toolbarProps} />

            {isLoading ? (
                <CalendarSkeleton />
            ) : (
                <DragAndDropCalendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 'calc(100vh - 150px)', borderRadius: '0 0 0.5rem 0.5rem' }}
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
                    // 🔑 Utilitzem l'adaptador que BigCalendar espera
                    onNavigate={handleCalendarNavigate}
                    className={cn('rbc-calendar-force-light-theme')}
                    components={{
                        toolbar: () => null,
                        event: (props) =>
                            props.event.eventType === 'skeleton' ? (
                                <CalendarSkeletonEvent {...props} />
                            ) : (
                                <div className="rbc-event-content">{props.title}</div>
                            ),
                    }}
                />
            )}

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