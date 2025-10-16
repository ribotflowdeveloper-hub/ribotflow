// src/app/[locale]/(app)/crm/calendari/_components/CalendarToolbar.tsx
'use client';

import { ToolbarProps, View } from 'react-big-calendar';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, Filter, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { EventSourcesState } from './CalendarClient';
import { CalendarEvent } from '@/types/crm';
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-gray-200',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

interface CalendarToolbarProps extends ToolbarProps<CalendarEvent> {
  eventSources: EventSourcesState;
  onEventSourcesChange: Dispatch<SetStateAction<EventSourcesState>>;
  onCreateTask: () => void;
}

type CalendarViewTranslationKey = 'month' | 'week' | 'day' | 'agenda';

export default function CalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
  views,
  eventSources,
  onEventSourcesChange,
  onCreateTask,
}: CalendarToolbarProps) {
  const t = useTranslations('Calendar');
  const tFilters = useTranslations('Calendar.filters');

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-2 pb-2 bg-white rounded-t-md py-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('PREV')} aria-label={t('previous')}>
          <ChevronLeft className="h-4 w-4 text-black" />
        </Button>
        <Button variant="ghost" className="font-semibold text-black" onClick={() => onNavigate('TODAY')}>
          {t('today')}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onNavigate('NEXT')} aria-label={t('next')}>
          <ChevronRight className="h-4 w-4 text-black" />
        </Button>
        <h2 className="text-2xl font-bold ml-6 text-white">{label}</h2>
      </div>

      <div className="flex items-center gap-3">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(newView: View) => { if (newView) onView(newView); }}
          aria-label="Calendar view"
        >
          {(views as View[]).map((viewName) => (
            <ToggleGroupItem key={viewName} value={viewName} aria-label={t(viewName as CalendarViewTranslationKey)} className="capitalize text-black">
              {t(viewName as CalendarViewTranslationKey)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator orientation="vertical" className="h-8" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={tFilters('title')}>
              <Filter className="h-4 w-4 text-black" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-white">{tFilters('title')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={eventSources.tasks} onCheckedChange={(checked) => onEventSourcesChange({ ...eventSources, tasks: !!checked })}>
              {tFilters('tasks')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={eventSources.quotes} onCheckedChange={(checked) => onEventSourcesChange({ ...eventSources, quotes: !!checked })}>
              {tFilters('quotes')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={eventSources.emails} onCheckedChange={(checked) => onEventSourcesChange({ ...eventSources, emails: !!checked })}>
              {tFilters('emailsSent')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={eventSources.receivedEmails} onCheckedChange={(checked) => onEventSourcesChange({ ...eventSources, receivedEmails: !!checked })}>
              {tFilters('emailsReceived')}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onCreateTask} className="text-white">
          <PlusCircle className="mr-2 h-4 w-4 text-white" />
          {t('newTask')}
        </Button>
      </div>
    </div>
  );
}
