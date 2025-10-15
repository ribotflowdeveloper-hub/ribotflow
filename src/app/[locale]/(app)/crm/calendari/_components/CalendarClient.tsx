'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, EventPropGetter, CalendarProps, SlotInfo, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { useTranslations } from 'next-intl';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { CalendarEvent } from '@/types/crm';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from './CalendarData';
import { TaskDialogManager } from '@/components/features/tasks/TaskDialogManager';
import { getCalendarData } from '../actions';
import { Tables } from '@/types/supabase';
import CalendarToolbar from './CalendarToolbar';
import useCalendar from '../_hooks/useCalendar';
import { QuoteDetailDialog } from './QuoteDetailDialog';
import { EmailDetailDialog } from './EmailDetailDialog';

export type EventSourcesState = {
  tasks: boolean;
  quotes: boolean;
  emails: boolean;
  receivedEmails: boolean;
};

const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DragAndDropCalendar = withDragAndDrop(Calendar as React.ComponentType<CalendarProps<CalendarEvent>>);

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
}

export default function CalendarClient({
  initialTasks,
  initialQuotes,
  initialSentEmails,
  initialReceivedEmails,
  teamUsers,
  contacts,
  departments,
}: CalendarClientProps) {
  const t = useTranslations('Calendar');

  const [tasks, setTasks] = useState(initialTasks);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [sentEmails, setSentEmails] = useState(initialSentEmails);
  const [receivedEmails, setReceivedEmails] = useState(initialReceivedEmails);

  // ✅ CORRECCIÓ: Declaració dels estats que faltaven
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<EnrichedTaskForCalendar | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<EnrichedQuoteForCalendar | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EnrichedEmailForCalendar | null>(null);
  
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  const [eventSources, setEventSources] = useState<EventSourcesState>({
    tasks: true,
    quotes: true,
    emails: true,
    receivedEmails: true,
  });

  const handleDataMutation = useCallback(async () => {
    setIsTaskDialogOpen(false); // Tanquem el diàleg de tasques si estava obert
    const updatedData = await getCalendarData();
    if (updatedData.tasks) setTasks(updatedData.tasks);
    if (updatedData.quotes) setQuotes(updatedData.quotes);
    if (updatedData.sentEmails) setSentEmails(updatedData.sentEmails);
    if (updatedData.receivedEmails) setReceivedEmails(updatedData.receivedEmails);
  }, []);

  const handleMoveTask = useCallback((taskId: number, newDueDate: string) => {
    setTasks(currentTasks => currentTasks.map(t => t.id === taskId ? { ...t, due_date: newDueDate } : t));
  }, []);

  const { handleMoveEvent } = useCalendar(tasks, handleMoveTask);

  const handleSelectEvent = (event: CalendarEvent) => {
    switch (event.eventType) {
      case 'task':
        setSelectedTask(event.resource as EnrichedTaskForCalendar);
        setIsTaskDialogOpen(true);
        break;
      case 'quote':
        setSelectedQuote(event.resource as EnrichedQuoteForCalendar);
        setIsQuoteDialogOpen(true);
        break;
      case 'email':
      case 'receivedEmail':
        setSelectedEmail(event.resource as EnrichedEmailForCalendar);
        setIsEmailDialogOpen(true);
        break;
      default:
        break;
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (view === 'day') return;
    setView('day');
    setDate(slotInfo.start);
  };
  
  const handleOpenNewTaskDialog = () => {
    setSelectedTask(null);
    setInitialDate(new Date());
    setIsTaskDialogOpen(true);
  };

  const filteredEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    if (eventSources.tasks) {
      tasks.forEach(task => { if (task.due_date) { events.push({ id: `task-${task.id}`, title: task.title, start: new Date(task.due_date), end: new Date(task.due_date), allDay: true, resource: task, eventType: 'task' }); } });
    }
    if (eventSources.quotes) {
      quotes.forEach(quote => { if (quote.expiry_date) { events.push({ id: `quote-${quote.id}`, title: `Venciment P.: ${quote.contacts?.nom || 'N/A'}`, start: new Date(quote.expiry_date), end: new Date(quote.expiry_date), allDay: true, resource: quote, eventType: 'quote' }); } });
    }
    if (eventSources.emails) {
      sentEmails.forEach(email => { if (email.sent_at) { const recipientName = email.contacts?.nom || email.sender_name || 'Destinatari desconegut'; events.push({ id: `email-${email.id}`, title: `Correu a: ${recipientName}`, start: new Date(email.sent_at), end: new Date(email.sent_at), allDay: false, resource: email, eventType: 'email' }); } });
    }
    if (eventSources.receivedEmails) {
      receivedEmails.forEach(email => { if (email.sent_at) { const senderName = email.sender_name || email.contacts?.nom || 'Remitent desconegut'; events.push({ id: `received-${email.id}`, title: `Correu de: ${senderName}`, start: new Date(email.sent_at), end: new Date(email.sent_at), allDay: false, resource: email, eventType: 'receivedEmail' }); } });
    }
    return events;
  }, [tasks, quotes, sentEmails, receivedEmails, eventSources]);
  
  const messages = {
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
  };

  return (
    <div>
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
        onView={setView}
        onNavigate={setDate}
        components={{
          toolbar: (toolbarProps) => (
            <CalendarToolbar
              {...toolbarProps}
              eventSources={eventSources}
              onEventSourcesChange={setEventSources}
              onCreateTask={handleOpenNewTaskDialog}
            />
          ),
        }}
      />

      <TaskDialogManager
        task={selectedTask ? { ...selectedTask, user_id: selectedTask.user_id ?? '' } : null}
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        contacts={contacts}
        departments={departments}
        teamMembers={teamUsers}
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