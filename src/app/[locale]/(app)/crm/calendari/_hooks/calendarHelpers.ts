import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, endOfDay } from 'date-fns';

export const getDateRange = (date: Date, view: string) => {
  const weekOptions = { weekStartsOn: 1 as const };
  switch(view) {
    case 'month': return { start: startOfWeek(startOfMonth(date), weekOptions), end: endOfWeek(endOfMonth(date), weekOptions) };
    case 'week': case 'agenda': return { start: startOfWeek(date, weekOptions), end: endOfWeek(date, weekOptions) };
    case 'day': return { start: date, end: endOfDay(date) };
    default: return { start: startOfWeek(date, weekOptions), end: endOfWeek(date, weekOptions) };
  }
};
