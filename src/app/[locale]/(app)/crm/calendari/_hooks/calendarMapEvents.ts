import { CalendarEvent } from '@/types/crm';
import { EventSourcesState } from '../_components/CalendarClient';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from '../_components/CalendarData';
import { addDays, startOfWeek } from 'date-fns'; // 🔑 Necessari per al fallback

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

  // 1. Definició estricta de tipus d'esdeveniment
  type EventType = 'skeleton' | 'task' | 'quote' | 'email' | 'receivedEmail';
  const EVENT_TYPE_SKELETON: EventType = 'skeleton'; // 🔑 Definició del literal per al fix

  const allEvents: (EnrichedTaskForCalendar | EnrichedQuoteForCalendar | EnrichedEmailForCalendar)[] = [];
  
  // Mantenim l'acumulació de tots els esdeveniments per al mode predictiu
  if (eventSources.tasks) allEvents.push(...tasks);
  if (eventSources.quotes) allEvents.push(...quotes);
  if (eventSources.emails) allEvents.push(...sentEmails);
  if (eventSources.receivedEmails) allEvents.push(...receivedEmails);


  if (isLoading) {
    // 🔑 FIX DE PREDICCIÓ: Si està carregant i tenim dades antigues, les usem com a skeleton
    
    // Fallback: Si no hi havia res carregat, creem un patró uniforme de skeletons.
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
                    eventType: EVENT_TYPE_SKELETON // 🔑 Ús del literal
                });
            }
        });
        return fallbackEvents;
    }
    
    // Mapegem els esdeveniments antics com a Skeletons predictius
    return allEvents.map((item, index) => {
        let d: Date | null = null;
        let allDay: boolean = true;
        
        // Determinem el tipus per saber quina data buscar
        if ('priority' in item) { d = item.due_date ? new Date(item.due_date) : null; } 
        else if ('expiry_date' in item) { d = item.expiry_date ? new Date(item.expiry_date) : null; } 
        else if ('sent_at' in item) { 
            // type = item.type === 'enviat' ? 'email' : 'receivedEmail'; // Eliminat perquè no s'utilitza
            d = item.sent_at ? new Date(item.sent_at) : null;
            allDay = false;
        } else {
            // Si el tipus no es pot determinar, retornem un skeleton genèric
            return { id: `unknown-${index}`, title: 'Carregant...', start: new Date(), end: new Date(), allDay: true, resource: null, eventType: EVENT_TYPE_SKELETON };
        }
        
        const validDate = d || new Date(); 

        return {
            id: `skeleton-predictive-${item.id}-${index}`, 
            title: 'Carregant...', // El title ja es pot deixar com a string
            start: validDate, 
            end: validDate, 
            allDay: allDay, 
            resource: item,
            eventType: EVENT_TYPE_SKELETON // 🔑 Ús del literal forçat
        };
    }).filter(e => e.start);
  }

  // -------------------------------------------------------------------------
  // 2. Lògica normal (quan no està carregant)
  // -------------------------------------------------------------------------
  const events: CalendarEvent[] = [];

  const addEvent = <T extends { id: number }>(
    source: T[],
    type: EventType, // Ja utilitza el tipus restringit
    getDate: (item: T) => Date | null,
    getTitle: (item: T) => string
  ) => {
    source.forEach(item => {
      const d = getDate(item);
      if (d) events.push({ id: `${type}-${item.id}`, title: getTitle(item), start: d, end: d, allDay: type !== 'email' && type !== 'receivedEmail', resource: item, eventType: type });
    });
  };

  if (eventSources.tasks) addEvent(tasks, 'task', t => t.due_date ? new Date(t.due_date) : null, t => t.title);
  if (eventSources.quotes) addEvent(quotes, 'quote', q => q.expiry_date ? new Date(q.expiry_date) : null, q => `Venciment P.: ${q.contacts?.nom || 'N/A'}`);
  if (eventSources.emails) addEvent(sentEmails, 'email', e => e.sent_at ? new Date(e.sent_at) : null, e => `Correu a: ${e.contacts?.nom || e.sender_name || 'Destinatari desconegut'}`);
  if (eventSources.receivedEmails) addEvent(receivedEmails, 'receivedEmail', e => e.sent_at ? new Date(e.sent_at) : null, e => `Correu de: ${e.contacts?.nom || e.sender_name || 'Remitent desconegut'}`);

  return events;
};