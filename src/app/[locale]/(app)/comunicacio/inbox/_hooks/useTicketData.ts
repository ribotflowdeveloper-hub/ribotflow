// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useTicketData.ts (CORREGIT FINAL)
import { useState, useTransition, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import {
  getTicketsAction,
  getTicketBodyAction,
  markTicketAsReadAction,
  getTicketByIdAction
} from '../actions';
import type { EnrichedTicket, TicketFilter } from '@/types/db';

type UseTicketDataProps = {
  initialTickets: EnrichedTicket[];
  activeFilter: TicketFilter;
  inboxFilter: string;
  searchTerm: string;
  onTicketSelected: (ticket: EnrichedTicket) => void;
  onTicketDeselected: () => void;
};

export function useTicketData({
  initialTickets,
  activeFilter,
  inboxFilter,
  searchTerm,
  onTicketSelected,
  onTicketDeselected,
}: UseTicketDataProps) {
  const [isPending, startTransition] = useTransition();
  const [tickets, setTickets] = useState<EnrichedTicket[]>(initialTickets);
  const [selectedTicketBody, setSelectedTicketBody] = useState<string | null>(null);
  const [isBodyLoading, setIsBodyLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialTickets.length > 0);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  useEffect(() => {
    startTransition(async () => {
      const results = await getTicketsAction(1, activeFilter, inboxFilter, debouncedSearchTerm);
      setTickets(results);
      setHasMore(results.length > 0);
      setPage(2);
    });
  }, [activeFilter, inboxFilter, debouncedSearchTerm]);

  const handleSelectTicket = useCallback(async (ticket: EnrichedTicket | null, currentSelectedId: number | undefined | null) => {
    if (currentSelectedId === ticket?.id) return;

    if (!ticket || !ticket.id) {
      setSelectedTicketBody(null);
      onTicketDeselected();
      return;
    }

    setIsBodyLoading(true);
    setSelectedTicketBody(null);
    onTicketSelected(ticket);

    try {
      const { body } = await getTicketBodyAction(ticket.id);
      setSelectedTicketBody(body);
    } catch (error) {
      console.error("Error en carregar el cos del tiquet:", error);
      setSelectedTicketBody('<p>Error en carregar el contingut.</p>');
    } finally {
      setIsBodyLoading(false);
    }

    if (ticket.status !== 'Llegit') {
      setTickets(currentTickets =>
        currentTickets.map(t => t.id === ticket.id ? { ...t, status: 'Llegit' as const } : t)
      );
      await markTicketAsReadAction(ticket.id);
    }
  }, [onTicketSelected, onTicketDeselected]);

  // ----------------------------------------------------------------------
  // 🎯 FUNCIÓ CLAU: FETCH I SELECCIÓ FORÇADA (FIX BODY)
  // ----------------------------------------------------------------------
  const fetchAndSelectTicket = useCallback(async (ticketId: number) => {

    console.log(`📡 [Fetch Ticket] Forçant càrrega per a l'ID: ${ticketId}`);

    // 1. Netejar cos anterior i posar càrrega
    setIsBodyLoading(true);
    setSelectedTicketBody(null);
    onTicketDeselected(); // Desselecciona l'anterior mentre carreguem

    // 2. Crida a la Server Action per obtenir el tiquet ENRIQUIT (sense el body)
    const result = await getTicketByIdAction(ticketId);

    if (result.error || !result.data) {
      console.error('❌ [Fetch Ticket] Error o tiquet no trobat:', result.error);
      toast.error("Error carregant el correu.", {
        description: result.error || "No s'ha pogut trobar el correu especificat."
      });
      setIsBodyLoading(false);
      return;
    }

    // 3. Trobem el tiquet, l'establirem com a seleccionat.
    const fetchedTicket = result.data;
    onTicketSelected(fetchedTicket); // 🔑 Estableix selectedTicket (sense el body)

    // --------------------------------------------------------------------
    // 🔑 FIX CLAU: Carregar el cos del correu amb la segona Server Action
    // --------------------------------------------------------------------
    try {
      if (typeof fetchedTicket.id === 'number') {
        const { body } = await getTicketBodyAction(fetchedTicket.id); // 5. Carrega el Body
        setSelectedTicketBody(body); // 6. Estableix el Body
      } else {
        throw new Error("ID del tiquet no vàlid.");
      }
    } catch (error) {
      console.error("Error en carregar el cos del tiquet forçat:", error);
      setSelectedTicketBody('<p>Error en carregar el contingut del correu.</p>');
    } finally {
      setIsBodyLoading(false);
    }
    // --------------------------------------------------------------------

    // 7. Opcional: Afegeix el tiquet a la llista local (per a millor UX de la llista)
    setTickets(prevTickets => {
      if (!prevTickets.some(t => t.id === fetchedTicket.id)) {
        // Com que l'hem carregat per ID, assumim que hauria d'estar al principi de la llista.
        return [fetchedTicket, ...prevTickets];
      }
      return prevTickets;
    });

    // 8. Marcar com a llegit (si escau)
    if (fetchedTicket.status !== 'Llegit') {
      setTickets(currentTickets =>
        currentTickets.map(t => t.id === fetchedTicket.id ? { ...t, status: 'Llegit' as const } : t)
      );
      if (typeof fetchedTicket.id === 'number') {
        await markTicketAsReadAction(fetchedTicket.id);
      }
    }


  }, [onTicketSelected, onTicketDeselected, setTickets, setIsBodyLoading, setSelectedTicketBody]);
  // ✅ CORRECCIÓ: Restaurem la lògica de 'handleLoadMore'
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isPending) return;
    startTransition(async () => {
      // Ara 'page' es fa servir correctament aquí
      const results = await getTicketsAction(page, activeFilter, inboxFilter, debouncedSearchTerm);
      if (results.length > 0) {
        setTickets(p => [...p, ...results]);
        setPage(p => p + 1);
      } else {
        setHasMore(false);
      }
    });
  }, [page, activeFilter, inboxFilter, debouncedSearchTerm, hasMore, isPending]);

  return {
    isPending,
    tickets,
    setTickets,
    selectedTicketBody,
    isBodyLoading,
    hasMore,
    debouncedSearchTerm,
    handleSelectTicket,
    handleLoadMore,
    fetchAndSelectTicket,
  };
}