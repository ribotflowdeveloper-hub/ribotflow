// src/app/[locale]/(app)/crm/calendari/_hooks/useCalendar.tsx
'use client'; 
// 🔹 Indiquem que és un component/client hook (necessari per React en entorns Next.js 13+)

// -----------------------------------------------------------------------------
// 📦 IMPORTACIONS
// -----------------------------------------------------------------------------
import { useCallback } from 'react';       // Per memoritzar funcions i evitar re-renderitzats innecessaris
import { toast } from 'sonner';            // Llibreria per mostrar notificacions d’usuari
import { updateTaskDate } from '../actions'; // Acció del servidor per actualitzar la data d’una tasca
import { CalendarEvent } from '@/types/crm'; // Tipus genèric d’esdeveniment del calendari
import { EnrichedTaskForCalendar } from '../_components/CalendarData'; // Tipus específic per a tasques

// -----------------------------------------------------------------------------
// 🧠 DESCRIPCIÓ GENERAL
// -----------------------------------------------------------------------------
// Aquest hook encapsula la lògica de "Drag & Drop" per moure esdeveniments
// (ara mateix només tasques) dins el calendari.
// Quan una tasca es mou de dia, actualitza el seu due_date tant al frontend
// com al backend, gestionant errors i notificacions d’usuari.
// -----------------------------------------------------------------------------

export default function useCalendar(
  tasks: EnrichedTaskForCalendar[],                      // 🔸 Llista actual de tasques mostrades al calendari
  onTaskMove: (taskId: number, newDueDate: string) => void // 🔸 Callback per actualitzar el frontend de manera optimista
) {

  // ---------------------------------------------------------------------------
  // 🎯 handleMoveEvent
  // ---------------------------------------------------------------------------
  // Aquesta funció es crida quan l’usuari arrossega una tasca a una nova data.
  // Actualitza la data tant al frontend (optimista) com al backend (definitiu).
  // ---------------------------------------------------------------------------

  const handleMoveEvent = useCallback(async ({ event, start }: { event: CalendarEvent, start: string | Date }) => {
    // 🧠 Només tractem esdeveniments de tipus "tasca"
    if (event.eventType !== 'task') return;
    
    // 🔍 Extraiem l’ID de la tasca: pot venir amb prefix (“task-”), així que el netegem
    const taskId = Number(String(event.id).replace('task-', ''));

    // 🕓 Convertim la nova data d’inici a format ISO per coherència amb el backend
    const newDueDate = new Date(start).toISOString();

    // 🔎 Busquem la tasca original (per poder fer un revert si falla)
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return; // Si no la trobem, parem aquí

    // -------------------------------------------------------------------------
    // 🧩 ACTUALITZACIÓ OPTIMISTA
    // -------------------------------------------------------------------------
    // Actualitzem el frontend immediatament per donar sensació de fluïdesa.
    // Si després hi ha error de servidor, revertirem la data.
    onTaskMove(taskId, newDueDate);

    // -------------------------------------------------------------------------
    // ⚙️ ACTUALITZACIÓ REAL AL BACKEND
    // -------------------------------------------------------------------------
    const result = await updateTaskDate(taskId, newDueDate);

    // -------------------------------------------------------------------------
    // 🧯 GESTIÓ D'ERRORS I FEEDBACK A L’USUARI
    // -------------------------------------------------------------------------
    if (result.error) {
        // ❌ Si el servidor respon amb error, mostrem toast i revertim la data
        toast.error("Error en actualitzar la data.", { description: result.error.db });
        onTaskMove(taskId, originalTask.due_date!);
    } else {
        // ✅ Si tot va bé, mostrem confirmació d’èxit
        toast.success("Tasca actualitzada correctament.");
    }

  // 🧩 Dependències: només canvia si canvien les tasques o la funció de moviment
  }, [tasks, onTaskMove]);

  // ---------------------------------------------------------------------------
  // 📤 RETORN DEL HOOK
  // ---------------------------------------------------------------------------
  // Exposem només la funció principal, ja que la resta és interna.
  // El component que utilitza el calendari (ex: CalendarClient) la rebrà
  // i la passarà al component de calendari com a handler d’“onEventDrop”.
  // ---------------------------------------------------------------------------
  return { handleMoveEvent };
}
