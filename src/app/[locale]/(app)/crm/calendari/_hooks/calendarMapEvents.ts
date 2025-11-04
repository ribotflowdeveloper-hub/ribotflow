// src/app/[locale]/(app)/crm/calendari/_hooks/calendarMapEvents.ts

import { CalendarEvent } from '@/types/crm';
import { EventSourcesState } from '../_components/CalendarClient';
import type { 
    EnrichedTaskForCalendar, 
    EnrichedQuoteForCalendar, 
    EnrichedEmailForCalendar 
} from '../_components/CalendarData'; 
// ✅ PAS 1: Importar 'addMinutes'
import { addDays, startOfWeek, addMinutes } from 'date-fns'; 

interface MapEventsParams {
  tasks: EnrichedTaskForCalendar[];
  quotes: EnrichedQuoteForCalendar[];
  sentEmails: EnrichedEmailForCalendar[];
  receivedEmails: EnrichedEmailForCalendar[];
  eventSources: EventSourcesState;
  isLoading: boolean;
  date: Date;
}

export const mapEvents = ({
  tasks, quotes, sentEmails, receivedEmails, eventSources, isLoading, date
}: MapEventsParams): CalendarEvent[] => {

  type EventType = 'skeleton' | 'task' | 'quote' | 'email' | 'receivedEmail';
  const EVENT_TYPE_SKELETON: EventType = 'skeleton'; 

  const allEvents: (EnrichedTaskForCalendar | EnrichedQuoteForCalendar | EnrichedEmailForCalendar)[] = [];
  
  if (eventSources.tasks) allEvents.push(...tasks);
  if (eventSources.quotes) allEvents.push(...quotes);
  if (eventSources.emails) allEvents.push(...sentEmails);
  if (eventSources.receivedEmails) allEvents.push(...receivedEmails);

  // ... (La teva lògica de 'isLoading' és correcta, no la toco) ...
  if (isLoading) {
    if (allEvents.length === 0) {
      const fallbackEvents: CalendarEvent[] = [];
      const WEEK_STARTS_ON = 1 as const;
      const skeletonsPerDay = 2;
      const currentWeekDays = Array.from({ length: 7 }, (_, i) => 
            addDays(startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }), i)
      );
      let skeletonCounter = 0;
      currentWeekDays.forEach((d) => {
            for (let i = 0; i < skeletonsPerDay; i++) {
                fallbackEvents.push({
                    id: `skeleton-fallback-${skeletonCounter++}`, 
                    title: 'Carregant...', 
                    start: d, 
                    end: d, 
                    allDay: true, 
                    resource: null, 
                    eventType: EVENT_TYPE_SKELETON
                });
            }
      });
      return fallbackEvents;
    }
    
    return allEvents.map((item, index) => {
      let d: Date | null = null;
      let allDay: boolean = true;
      
      if ('priority' in item) { d = item.due_date ? new Date(item.due_date) : null; } 
      else if ('expiry_date' in item) { d = item.expiry_date ? new Date(item.expiry_date) : null; } 
      else if ('sent_at' in item) { 
          d = item.sent_at ? new Date(item.sent_at) : null;
          allDay = false;
      } else {
          return { id: `unknown-${index}`, title: 'Carregant...', start: new Date(), end: new Date(), allDay: true, resource: null, eventType: EVENT_TYPE_SKELETON };
      }
      
      const validDate = d || new Date(); 
      const endDate = allDay ? validDate : addMinutes(validDate, 30); // Durada per a skeletons

      return {
          id: `skeleton-predictive-${item.id}-${index}`, 
          title: 'Carregant...', 
          start: validDate, 
          end: endDate, // ⬅️ Usar endDate
          allDay: allDay, 
          resource: item,
          eventType: EVENT_TYPE_SKELETON
      };
    }).filter(e => e.start);
  }

  // -------------------------------------------------------------------------
  // 2. LÒGICA CORREGIDA (SECCIÓ CLAU)
  // -------------------------------------------------------------------------
  const events: CalendarEvent[] = [];
  const DEFAULT_EVENT_DURATION_MINUTES = 30; // Durada per defecte

  const addEvent = <T extends { id: number | string }>( // Permetem id de string per a emails
    source: T[],
    type: EventType,
    getDate: (item: T) => Date | null,
    getTitle: (item: T) => string,
    isAllDayOverride?: boolean 
  ) => {
    source.forEach(item => {
      const d = getDate(item);
      if (d) {
        let isAllDay: boolean;
        let endDate: Date;

        if (isAllDayOverride !== undefined) {
          isAllDay = isAllDayOverride;
        } else {
          // LÒGICA PER A TASQUES:
          // Si l'hora és mitjanit (00:00:00), és 'allDay'.
          isAllDay = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
        }
        
        // ✅ PAS 2: Definir la data de finalització (end)
        if (isAllDay) {
            // Si és 'allDay', el 'end' és igual al 'start' (RBC ja ho gestiona)
            endDate = d;
        } else {
            // Si NO és 'allDay', li donem una durada per defecte
            endDate = addMinutes(d, DEFAULT_EVENT_DURATION_MINUTES);
        }

        events.push({ 
            id: `${type}-${item.id}`, 
            title: getTitle(item), 
            start: d, 
            end: endDate, // ⬅️ AQUESTA ÉS LA CORRECCIÓ
            allDay: isAllDay, 
            resource: item, 
            eventType: type 
        });
      }
    });
  };

  // Cridem a la funció amb la lògica correcta
  if (eventSources.tasks) {
      // Per a les tasques, no passem 'isAllDayOverride'. Deixem que ho calculi.
      addEvent(tasks, 'task', t => t.due_date ? new Date(t.due_date) : null, t => t.title);
  }
  if (eventSources.quotes) {
      // Els venciments de pressupostos SÓN 'allDay'
      addEvent(quotes, 'quote', q => q.expiry_date ? new Date(q.expiry_date) : null, q => `Venciment P.: ${q.contacts?.nom || 'N/A'}`, true);

  }
  if (eventSources.emails) {
      // Els correus NO SÓN 'allDay'
      addEvent(sentEmails, 'email', e => e.sent_at ? new Date(e.sent_at) : null, e => `Correu a: ${e.contacts?.nom || e.sender_name || 'Destinatari desconegut'}`, false);
}
  if (eventSources.receivedEmails) {
      // Els correus NO SÓN 'allDay'
      addEvent(receivedEmails, 'receivedEmail', e => e.sent_at ? new Date(e.sent_at) : null, e => `Correu de: ${e.contacts?.nom || e.sender_name || 'Remitent desconegut'}`, false);
  }

  return events;
};