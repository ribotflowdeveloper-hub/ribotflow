// src/app/[locale]/(app)/crm/calendari/_hooks/useCalendarDialogs.ts
'use client';

// 🔧 React Hooks bàsics per a gestió d’estats i memòria de funcions
import { useState, useCallback } from 'react';

// ✅ Importem tipus del calendari (View i SlotInfo) per definir signatures més precises
import { SlotInfo, View } from 'react-big-calendar'; 

// 🔤 Tipus del nostre projecte CRM (perquè els diàlegs sàpiguen quin tipus d’objecte estan obrint)
import { CalendarEvent } from '@/types/crm';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from '../_components/CalendarData';

// ✅ Definim el tipus de la funció que rep del Controller (per actualitzar vista i data)
type UpdateDateAndData = (newDate: Date, newView: View) => void;

interface UseCalendarDialogsProps {
    updateDateAndData: UpdateDateAndData;
}

/**
 * 🎯 Hook personalitzat que centralitza tota la lògica de gestió dels diàlegs del calendari:
 * - Obrir i tancar diàlegs per tasques, pressupostos i correus.
 * - Gestionar quin element està seleccionat.
 * - Obrir el mode “crear nova tasca” o “anar a vista de dia”.
 */
export const useCalendarDialogs = ({ updateDateAndData }: UseCalendarDialogsProps) => {

    // -------------------------------------------------------------------------
    // 🧩 1. ESTATS DE DIÀLEGS
    // -------------------------------------------------------------------------
    // Controlen si els diferents diàlegs (Task, Quote, Email) estan oberts o tancats.
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    
    // -------------------------------------------------------------------------
    // 📌 2. ESTATS D’ELEMENTS SELECCIONATS
    // -------------------------------------------------------------------------
    // Quan l’usuari fa clic en un esdeveniment, guardem quin tipus d’element és.
    // Això permet que el diàleg mostri la informació específica de cada cas.
    const [selectedTask, setSelectedTask] = useState<EnrichedTaskForCalendar | null>(null);
    const [selectedQuote, setSelectedQuote] = useState<EnrichedQuoteForCalendar | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<EnrichedEmailForCalendar | null>(null);
    
    // -------------------------------------------------------------------------
    // 🕒 3. DATA INICIAL PER A CREACIÓ
    // -------------------------------------------------------------------------
    // S'utilitza quan l’usuari vol crear una nova tasca manualment.
    const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

    // -------------------------------------------------------------------------
    // 🎯 4. HANDLER: Quan l’usuari selecciona un esdeveniment existent
    // -------------------------------------------------------------------------
    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        // 🔄 Reiniciem els estats anteriors (per evitar que quedin oberts diversos diàlegs)
        setSelectedTask(null);
        setSelectedQuote(null);
        setSelectedEmail(null);

        // 🧠 Decidim quin diàleg obrir segons el tipus d’esdeveniment seleccionat
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
    }, []);

    // -------------------------------------------------------------------------
    // 🗓️ 5. HANDLER: Quan es fa clic a un espai buit del calendari (slot)
    // -------------------------------------------------------------------------
    const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
        // 🔁 Fem servir la funció del Controller per canviar la vista del calendari a “dia”
        // Això permet mostrar de seguida la data clicada amb els esdeveniments corresponents.
        updateDateAndData(slotInfo.start, 'day');
    }, [updateDateAndData]);

    // -------------------------------------------------------------------------
    // ✨ 6. HANDLER: Obrir el diàleg per crear una nova tasca
    // -------------------------------------------------------------------------
    const handleOpenNewTaskDialog = useCallback(() => {
        // Assegurem que no hi ha cap tasca seleccionada (nova creació)
        setSelectedTask(null);

        // Assignem la data actual com a base per a la nova tasca
        setInitialDate(new Date());

        // Obrim el diàleg de creació
        setIsTaskDialogOpen(true);
    }, []);

    // -------------------------------------------------------------------------
    // 📤 7. RETORN DEL HOOK
    // -------------------------------------------------------------------------
    // Exposem tant els estats com els handlers perquè el component pare (Calendari)
    // pugui controlar i reaccionar davant les interaccions.
    return {
        // Estats dels diàlegs
        isTaskDialogOpen,
        isQuoteDialogOpen,
        isEmailDialogOpen,
        setIsTaskDialogOpen,
        setIsQuoteDialogOpen,
        setIsEmailDialogOpen,

        // Elements seleccionats
        selectedTask,
        selectedQuote,
        selectedEmail,
        initialDate,

        // Handlers per al calendari
        handleSelectEvent,
        handleSelectSlot,
        handleOpenNewTaskDialog,
    };
};
