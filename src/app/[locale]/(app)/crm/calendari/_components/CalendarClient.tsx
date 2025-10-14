'use client';

import { useState } from 'react';
import { Calendar, dateFnsLocalizer, EventPropGetter, CalendarProps, SlotInfo } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { priorityStyles, TaskPriority } from '@/config/styles/task';

import useCalendar from '../_hooks/useCalendar';
import { CalendarEvent } from '@/types/crm';
import { EnrichedTaskForCalendar } from './CalendarData';
import { TaskDialogManager } from '@/components/features/tasks/TaskDialogManager'; // Assumint la nova ubicació
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Tables } from '@/types/supabase';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DragAndDropCalendar = withDragAndDrop(Calendar as React.ComponentType<CalendarProps<CalendarEvent>>);

interface CalendarClientProps {
  initialTasks: EnrichedTaskForCalendar[];
  teamUsers: { id: string; full_name: string | null }[];
  contacts: Tables<'contacts'>[];
  departments: Tables<'departments'>[];
}

const eventStyleGetter: EventPropGetter<CalendarEvent> = (event) => {
    const task = event.resource;
    const priority = task.priority as TaskPriority | null;
    
    // ✅ Utilitzem els colors HEX del nostre objecte centralitzat
    const backgroundColor = priority ? priorityStyles[priority].hexColor : '#3174ad'; // Color per defecte

    const style = {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
    };
    return { style };
};

export default function CalendarClient({ initialTasks, teamUsers, contacts, departments }: CalendarClientProps) {
  const t = useTranslations('Calendar');
  const router = useRouter();

  // Lògica del calendari (només events i drag-and-drop)
  const { events, handleMoveEvent } = useCalendar(initialTasks);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  // NOU: Estat per gestionar el diàleg unificat
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EnrichedTaskForCalendar | null>(null);

  // ✅ SOLUCIÓ: Centralitzem la lògica aquí també.
  const handleTaskMutation = () => {
    router.refresh();
    setIsDialogOpen(false);
  };


  // NOU: Gestors d'events per obrir el diàleg
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedTask(event.resource as EnrichedTaskForCalendar);
    setIsDialogOpen(true);
  };

  // ✅ SOLUCIÓ: Ara fem servir 'slotInfo' per guardar la data d'inici
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedTask(null);
    setInitialDate(slotInfo.start); // Guardem la data del dia clicat
    setIsDialogOpen(true);
  };

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
      <div className="flex justify-end mb-4">
        {/* Aquest botó ara utilitza els nous gestors d'estat */}
        <Button
          onClick={() =>
            handleSelectSlot({
              start: new Date(),
              end: new Date(),
              slots: [new Date()],
              action: 'select'
            })
          }
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('newTask')}
        </Button>
      </div>

      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleMoveEvent}
        eventPropGetter={eventStyleGetter}
        messages={messages}
        culture='es'
      />

      <TaskDialogManager
        task={
          selectedTask
            ? { ...selectedTask, user_id: selectedTask.user_id ?? '' }
            : null
        }
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contacts={contacts}
        departments={departments}
        teamMembers={teamUsers}
        onTaskMutation={handleTaskMutation}
        initialDate={initialDate}

      />
    </div>
  );
}